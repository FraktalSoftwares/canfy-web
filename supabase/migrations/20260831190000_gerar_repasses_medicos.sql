-- Geração automática do repasse (comissão) do médico quando um pedido é entregue.
--
-- Regras decididas com o produto:
--   * Percentual: configuracoes_sistema.percentual_comissao_medico (default 5.00),
--     lido em tempo de geração — nunca hardcoded.
--   * Base de cálculo: pedidos.valor_total - pedidos.frete_valor (frete é custo de
--     transportadora, não receita comissionável).
--   * Gatilho: pedido entra em status 'entregue' (estado terminal de sucesso).
--   * Médico: resolvido via pedidos.receita_id -> receitas.medico_id. Pedido sem
--     receita vinculada não gera repasse.
--
-- Também cria os dois RPCs que o app mobile do médico já consome
-- (medico_listar_repasses / medico_resumo_financeiro) e que nunca existiram.

-- 1. Idempotência: no máximo um repasse por pedido.
CREATE UNIQUE INDEX IF NOT EXISTS idx_repasses_medicos_pedido_unico
  ON public.repasses_medicos(pedido_id)
  WHERE pedido_id IS NOT NULL;

-- 2. Geração do repasse de um pedido. Retorna o id criado, ou NULL quando não
-- aplicável (sem médico, sem valor comissionável, ou repasse já existente).
CREATE OR REPLACE FUNCTION public.gerar_repasse_pedido(p_pedido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico_id uuid;
  v_base numeric(10,2);
  v_percentual numeric(5,2);
  v_valor numeric(10,2);
  v_repasse_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM repasses_medicos WHERE pedido_id = p_pedido_id) THEN
    RETURN NULL;
  END IF;

  SELECT r.medico_id,
         GREATEST(COALESCE(p.valor_total, 0) - COALESCE(p.frete_valor, 0), 0)
    INTO v_medico_id, v_base
    FROM pedidos p
    JOIN receitas r ON r.id = p.receita_id
   WHERE p.id = p_pedido_id;

  IF v_medico_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(percentual_comissao_medico, 0)
    INTO v_percentual
    FROM configuracoes_sistema
   WHERE id = 1;

  v_valor := ROUND(v_base * COALESCE(v_percentual, 0) / 100, 2);

  IF v_valor <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO repasses_medicos (medico_id, pedido_id, valor, status, observacao)
  VALUES (
    v_medico_id,
    p_pedido_id,
    v_valor,
    'pendente',
    format('Comissão de %s%% sobre R$ %s (pedido entregue)', v_percentual, v_base)
  )
  ON CONFLICT (pedido_id) WHERE pedido_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_repasse_id;

  RETURN v_repasse_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.gerar_repasse_pedido(uuid) FROM PUBLIC;

-- 3. Trigger: qualquer caminho que leve o pedido a 'entregue' gera o repasse
-- (admin_update_pedido_entrega hoje, e qualquer outro amanhã).
CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_gerar_repasse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.gerar_repasse_pedido(NEW.id);
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS pedido_entregue_gerar_repasse ON public.pedidos;

CREATE TRIGGER pedido_entregue_gerar_repasse
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
WHEN (NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_pedido_entregue_gerar_repasse();

-- 4. RPCs consumidos pelo app mobile do médico (financial_page / home_page).
CREATE OR REPLACE FUNCTION public.medico_listar_repasses(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  data_repasse date,
  valor numeric,
  status text,
  observacao text,
  pedido_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico uuid;
BEGIN
  v_medico := public.medico_atual_id();
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.data_repasse, r.valor, r.status, r.observacao, r.pedido_id
  FROM repasses_medicos r
  WHERE r.medico_id = v_medico
  ORDER BY r.data_repasse DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.medico_listar_repasses(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.medico_resumo_financeiro()
RETURNS TABLE(
  total_recebido numeric,
  total_pendente numeric,
  total_atendimentos integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico uuid;
BEGIN
  v_medico := public.medico_atual_id();
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN r.status = 'efetuado' THEN r.valor END), 0)::numeric,
    COALESCE(SUM(CASE WHEN r.status = 'pendente' THEN r.valor END), 0)::numeric,
    COALESCE((SELECT m.total_atendimentos FROM medicos m WHERE m.id = v_medico), 0)
  FROM repasses_medicos r
  WHERE r.medico_id = v_medico;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.medico_resumo_financeiro() TO authenticated;
