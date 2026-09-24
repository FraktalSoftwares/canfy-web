-- consultas.valor é congelado no insert, a partir da configuração do sistema.
--
-- Duas razões:
--
-- 1. Correção. O preço da consulta nunca deve vir do cliente. Com a trigger, o
--    app não envia nem pode influenciar o valor: ele é lido de
--    configuracoes_sistema.valor_consulta_padrao no momento do agendamento e
--    congelado ali. Alterar a configuração depois não reescreve o histórico nem
--    muda a base de cálculo de um repasse já gerado.
--
-- 2. Compatibilidade. asaas-create-payment passou a derivar o valor da cobrança
--    de consultas.valor e recusa a cobrança se ele não existir. Sem esta trigger,
--    versões do app já instaladas — que criam a consulta sem valor — deixariam
--    de conseguir pagar.
--
-- Isto não é um fallback: é a fonte autoritativa do preço. Se a configuração não
-- existir, o agendamento falha em vez de gravar um valor inventado.

CREATE OR REPLACE FUNCTION public.trg_consulta_definir_valor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valor numeric(10,2);
BEGIN
  IF NEW.valor IS NOT NULL AND NEW.valor > 0 THEN
    RETURN NEW;
  END IF;

  SELECT valor_consulta_padrao INTO v_valor
    FROM configuracoes_sistema WHERE id = 1;

  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da consulta não configurado no sistema. Avise o administrativo da Canfy.';
  END IF;

  NEW.valor := v_valor;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS consulta_definir_valor ON public.consultas;
CREATE TRIGGER consulta_definir_valor
BEFORE INSERT ON public.consultas
FOR EACH ROW
EXECUTE FUNCTION public.trg_consulta_definir_valor();

REVOKE EXECUTE ON FUNCTION public.trg_consulta_definir_valor() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_consulta_definir_valor() IS
  'Congela consultas.valor a partir de configuracoes_sistema no agendamento. O preço nunca vem do cliente.';

-- ---------------------------------------------------------------------------
-- repasse_situacao sem search_path fixo (apontado pelo advisor
-- function_search_path_mutable). Ela não toca em tabelas, mas fixar o caminho
-- impede que alguém sombreie os builtins que ela usa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repasse_situacao(
  p_asaas_status     text,
  p_erro             text,
  p_pagamento_status text,
  p_status           text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog'
AS $function$
  SELECT CASE
    -- Precedência: o que não sai sozinho aparece primeiro.
    WHEN p_erro IS NOT NULL AND btrim(p_erro) <> ''                                  THEN 'pendencia'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('REFUSED','FAILED')                  THEN 'pendencia'
    WHEN upper(coalesce(p_asaas_status,'')) = 'DONE'                                 THEN 'pago'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('CANCELLED','REFUNDED')              THEN 'cancelado'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('AWAITING_CREDIT','BANK_PROCESSING') THEN 'em_transferencia'
    -- Sem estado no Asaas: vale o que foi registrado à mão.
    WHEN p_status = 'efetuado'                                                       THEN 'pago'
    WHEN p_status = 'cancelado'                                                      THEN 'cancelado'
    -- Ainda não saiu: depende de a Canfy já ter recebido do paciente.
    WHEN upper(coalesce(p_pagamento_status,'')) IN ('RECEIVED','CONFIRMED')          THEN 'a_transferir'
    ELSE 'aguardando_pagamento'
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.repasse_situacao(text, text, text, text) FROM PUBLIC, anon, authenticated;
