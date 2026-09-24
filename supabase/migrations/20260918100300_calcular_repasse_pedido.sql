-- Separa o CÁLCULO do repasse de pedido da sua GRAVAÇÃO.
--
-- Motivo: com split, a Edge Function precisa do valor da comissão *antes* de
-- criar a cobrança (para montar o array split[]), e precisa gravar o repasse
-- *depois* (quando já existe asaas_payment_id). Se cada etapa recalculasse por
-- conta própria — uma em TypeScript, outra em SQL — os dois números poderiam
-- divergir e o livro-caixa deixaria de bater com o que o Asaas repassou.
--
-- Com esta separação existe uma única fonte do cálculo: calcular_repasse_pedido.
-- A Edge Function apenas transporta o número; nunca o deriva.

-- ---------------------------------------------------------------------------
-- 1. Cálculo puro. Não grava nada.
--    Condições de negócio que impedem o repasse (médico sem carteira, subconta
--    não aprovada) voltam em `erro` — são estado a registrar, não exceção.
--    Só dado inconsistente levanta exceção.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_repasse_pedido(p_pedido_id uuid)
RETURNS TABLE(
  medico_id    uuid,
  wallet_id    text,
  percentual   numeric,
  base_calculo numeric,
  valor        numeric,
  erro         text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico_id  uuid;
  v_base       numeric(10,2);
  v_percentual numeric(5,2);
  v_valor      numeric(10,2);
  v_wallet     text;
  v_onboarding text;
  v_erro       text;
BEGIN
  SELECT r.medico_id,
         GREATEST(COALESCE(p.valor_total, 0) - COALESCE(p.frete_valor, 0), 0)
    INTO v_medico_id, v_base
    FROM pedidos p
    JOIN receitas r ON r.id = p.receita_id
   WHERE p.id = p_pedido_id;

  IF v_medico_id IS NULL THEN
    RAISE EXCEPTION 'Pedido % não tem receita vinculada; não há médico a quem repassar.', p_pedido_id;
  END IF;

  -- Override do médico tem precedência sobre o global. Lidos agora, em tempo de
  -- execução: alterar o percentual vale na próxima cobrança, sem deploy.
  SELECT COALESCE(m.percentual_comissao_pedido, cs.percentual_comissao_medico),
         m.asaas_wallet_id,
         m.asaas_onboarding_status
    INTO v_percentual, v_wallet, v_onboarding
    FROM medicos m
    CROSS JOIN configuracoes_sistema cs
   WHERE m.id = v_medico_id AND cs.id = 1;

  IF v_percentual IS NULL THEN
    RAISE EXCEPTION 'configuracoes_sistema (id=1) não encontrada ou sem percentual_comissao_medico.';
  END IF;

  v_valor := ROUND(v_base * v_percentual / 100, 2);

  IF v_valor <= 0 THEN
    v_erro := format('Comissão calculada ficou em zero (base R$ %s, percentual %s%%).', v_base, v_percentual);
  ELSIF v_wallet IS NULL THEN
    v_erro := 'Médico sem carteira Asaas: a comissão não pôde ser repassada automaticamente.';
  ELSIF v_onboarding IS DISTINCT FROM 'aprovado' THEN
    v_erro := format('Subconta Asaas do médico não aprovada (status: %s).', COALESCE(v_onboarding, 'desconhecido'));
  END IF;

  RETURN QUERY SELECT v_medico_id, v_wallet, v_percentual, v_base, v_valor, v_erro;
END;
$function$;

COMMENT ON FUNCTION public.calcular_repasse_pedido(uuid) IS
  'Fonte única do cálculo da comissão de pedido. A Edge Function usa o valor para montar o split[] e grava o repasse com o mesmo número.';

-- ---------------------------------------------------------------------------
-- 2. Gravação, agora sobre o cálculo acima e aceitando o id da cobrança.
--    Assinatura muda (ganha p_asaas_payment_id), por isso DROP antes do CREATE:
--    manter as duas versões tornaria a chamada de um argumento ambígua.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.gerar_repasse_pedido(uuid);

CREATE OR REPLACE FUNCTION public.gerar_repasse_pedido(
  p_pedido_id        uuid,
  p_asaas_payment_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calc       record;
  v_payment_id text;
  v_repasse_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM repasses_medicos WHERE pedido_id = p_pedido_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_calc FROM public.calcular_repasse_pedido(p_pedido_id);

  -- Comissão zero não gera linha: não há o que repassar nem o que cobrar.
  IF v_calc.valor <= 0 THEN
    RETURN NULL;
  END IF;

  v_payment_id := p_asaas_payment_id;
  IF v_payment_id IS NULL THEN
    SELECT ap.asaas_payment_id INTO v_payment_id
      FROM asaas_payments ap
     WHERE ap.reference_type = 'order'
       AND ap.reference_id = p_pedido_id::text
     ORDER BY ap.created_at DESC
     LIMIT 1;
  END IF;

  INSERT INTO repasses_medicos (
    medico_id, pedido_id, origem, valor, status, asaas_status,
    asaas_payment_id, percentual, base_calculo, erro, observacao
  )
  VALUES (
    v_calc.medico_id, p_pedido_id, 'pedido', v_calc.valor, 'pendente', 'PENDING',
    v_payment_id, v_calc.percentual, v_calc.base_calculo, v_calc.erro,
    format('Comissão de %s%% sobre R$ %s', v_calc.percentual, v_calc.base_calculo)
  )
  ON CONFLICT (pedido_id) WHERE pedido_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_repasse_id;

  RETURN v_repasse_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Grants: internas, chamadas apenas por Edge Function (service_role) ou por
--    outras funções SECURITY DEFINER.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.calcular_repasse_pedido(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_repasse_pedido(uuid, text)   FROM PUBLIC, anon, authenticated;
