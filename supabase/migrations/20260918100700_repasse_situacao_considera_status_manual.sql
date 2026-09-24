-- repasse_situacao passa a considerar o status gravado quando não há estado no Asaas.
--
-- Problema encontrado ao validar contra os dados reais: repasses liquidados
-- manualmente antes do split (status = 'efetuado', sem asaas_status e sem
-- cobrança vinculada) apareciam como "aguardando pagamento" — ou seja, dinheiro
-- que o médico já recebeu era exibido como se o paciente nem tivesse pagado.
--
-- A regra passa a ser: o estado do Asaas manda quando existe; na ausência dele,
-- vale o livro-caixa manual; e só então se olha para a cobrança de origem.
--
-- A assinatura ganha p_status, por isso a função e todas as que a chamam
-- precisam ser removidas e recriadas.

-- CASCADE não resolve aqui: o corpo de uma função plpgsql não gera dependência
-- rastreada pelo Postgres, então as funções que chamam repasse_situacao
-- sobreviveriam apontando para uma função inexistente. Cada uma é removida
-- explicitamente e recriada abaixo com a nova assinatura.
DROP FUNCTION IF EXISTS public.repasse_situacao(text, text, text);
DROP FUNCTION IF EXISTS public.medico_listar_repasses(integer);
DROP FUNCTION IF EXISTS public.medico_resumo_financeiro();
DROP FUNCTION IF EXISTS public.admin_get_medico_repasses(uuid);
DROP FUNCTION IF EXISTS public.admin_list_repasses(text, text, text, uuid, date, date, integer, integer);
DROP FUNCTION IF EXISTS public.admin_repasses_totais(date, date, uuid, text);

CREATE FUNCTION public.repasse_situacao(
  p_asaas_status     text,
  p_erro             text,
  p_pagamento_status text,
  p_status           text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
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

COMMENT ON FUNCTION public.repasse_situacao(text, text, text, text) IS
  'Fonte única da situação de um repasse (aguardando_pagamento|a_transferir|em_transferencia|pago|cancelado|pendencia). O estado do Asaas manda; sem ele, vale o status manual.';

-- ---------------------------------------------------------------------------
-- Recriação das funções removidas acima, agora passando r.status.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.medico_listar_repasses(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id            uuid,
  data_repasse  date,
  valor         numeric,
  status        text,
  situacao      text,
  origem        text,
  observacao    text,
  pedido_id     uuid,
  consulta_id   uuid,
  percentual    numeric,
  base_calculo  numeric,
  pago_em       timestamptz,
  erro          text
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
  SELECT r.id, r.data_repasse, r.valor, r.status,
         public.repasse_situacao(r.asaas_status, r.erro, ap.status, r.status),
         r.origem, r.observacao, r.pedido_id, r.consulta_id,
         r.percentual, r.base_calculo, r.pago_em, r.erro
    FROM repasses_medicos r
    LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
   WHERE r.medico_id = v_medico
   ORDER BY r.data_repasse DESC, r.created_at DESC
   LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

CREATE FUNCTION public.medico_resumo_financeiro()
RETURNS TABLE(
  total_recebido              numeric,
  total_pendente              numeric,
  total_pago                  numeric,
  total_a_caminho             numeric,
  total_aguardando_pagamento  numeric,
  qtd_pendencia               integer,
  valor_pendencia             numeric,
  total_atendimentos          integer
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
  WITH base AS (
    SELECT r.valor,
           r.status,
           public.repasse_situacao(r.asaas_status, r.erro, ap.status, r.status) AS situacao
      FROM repasses_medicos r
      LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
     WHERE r.medico_id = v_medico
  )
  SELECT
    COALESCE(SUM(b.valor) FILTER (WHERE b.status = 'efetuado'), 0)::numeric,
    COALESCE(SUM(b.valor) FILTER (WHERE b.status = 'pendente'), 0)::numeric,
    COALESCE(SUM(b.valor) FILTER (WHERE b.situacao = 'pago'), 0)::numeric,
    COALESCE(SUM(b.valor) FILTER (WHERE b.situacao IN ('a_transferir','em_transferencia')), 0)::numeric,
    COALESCE(SUM(b.valor) FILTER (WHERE b.situacao = 'aguardando_pagamento'), 0)::numeric,
    COALESCE(COUNT(*) FILTER (WHERE b.situacao = 'pendencia'), 0)::integer,
    COALESCE(SUM(b.valor) FILTER (WHERE b.situacao = 'pendencia'), 0)::numeric,
    COALESCE((SELECT m.total_atendimentos FROM medicos m WHERE m.id = v_medico), 0)
  FROM base b;
END;
$function$;

CREATE FUNCTION public.admin_get_medico_repasses(p_medico_id uuid)
RETURNS TABLE(
  id           uuid,
  data_repasse date,
  valor        numeric,
  status       text,
  situacao     text,
  origem       text,
  observacao   text,
  percentual   numeric,
  base_calculo numeric,
  pago_em      timestamptz,
  erro         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.data_repasse, r.valor, r.status,
         public.repasse_situacao(r.asaas_status, r.erro, ap.status, r.status),
         r.origem, r.observacao, r.percentual, r.base_calculo, r.pago_em, r.erro
    FROM repasses_medicos r
    LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
   WHERE r.medico_id = p_medico_id
   ORDER BY r.data_repasse DESC, r.created_at DESC;
END;
$function$;

CREATE FUNCTION public.admin_list_repasses(
  p_search    text    DEFAULT NULL,
  p_situacao  text    DEFAULT NULL,
  p_origem    text    DEFAULT NULL,
  p_medico    uuid    DEFAULT NULL,
  p_data_ini  date    DEFAULT NULL,
  p_data_fim  date    DEFAULT NULL,
  p_limit     integer DEFAULT 100,
  p_offset    integer DEFAULT 0
)
RETURNS TABLE(
  id             uuid,
  medico_id      uuid,
  medico_nome    text,
  origem         text,
  referencia     text,
  data_repasse   date,
  base_calculo   numeric,
  percentual     numeric,
  valor          numeric,
  status         text,
  situacao       text,
  asaas_status   text,
  pago_em        timestamptz,
  erro           text,
  total_count    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT r.id, r.medico_id, m.nome AS medico_nome, r.origem,
           COALESCE(p.numero_pedido, to_char(c.data_consulta, 'DD/MM/YYYY HH24:MI')) AS referencia,
           r.data_repasse, r.base_calculo, r.percentual, r.valor, r.status,
           public.repasse_situacao(r.asaas_status, r.erro, ap.status, r.status) AS situacao,
           r.asaas_status, r.pago_em, r.erro, r.created_at
      FROM repasses_medicos r
      JOIN medicos m ON m.id = r.medico_id
      LEFT JOIN pedidos p   ON p.id = r.pedido_id
      LEFT JOIN consultas c ON c.id = r.consulta_id
      LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
     WHERE (p_medico   IS NULL OR r.medico_id = p_medico)
       AND (p_origem   IS NULL OR r.origem = p_origem)
       AND (p_data_ini IS NULL OR r.data_repasse >= p_data_ini)
       AND (p_data_fim IS NULL OR r.data_repasse <= p_data_fim)
       AND (
         p_search IS NULL OR btrim(p_search) = ''
         OR m.nome ILIKE '%' || p_search || '%'
         OR COALESCE(p.numero_pedido, '') ILIKE '%' || p_search || '%'
       )
  ), filtrado AS (
    SELECT b.* FROM base b
     WHERE (p_situacao IS NULL OR b.situacao = p_situacao)
  )
  SELECT f.id, f.medico_id, f.medico_nome, f.origem, f.referencia, f.data_repasse,
         f.base_calculo, f.percentual, f.valor, f.status, f.situacao, f.asaas_status,
         f.pago_em, f.erro,
         (SELECT COUNT(*) FROM filtrado) AS total_count
    FROM filtrado f
   -- Abre no que exige ação, não no histórico.
   ORDER BY CASE f.situacao
              WHEN 'pendencia'        THEN 0
              WHEN 'a_transferir'     THEN 1
              WHEN 'em_transferencia' THEN 2
              ELSE 3
            END,
            f.data_repasse DESC, f.created_at DESC
   LIMIT GREATEST(COALESCE(p_limit, 100), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$;

CREATE FUNCTION public.admin_repasses_totais(
  p_data_ini date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_medico   uuid DEFAULT NULL,
  p_origem   text DEFAULT NULL
)
RETURNS TABLE(situacao text, quantidade bigint, valor_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT s.situacao, COUNT(r.id), COALESCE(SUM(r.valor), 0)::numeric
    FROM (VALUES ('aguardando_pagamento'),('a_transferir'),('em_transferencia'),
                 ('pago'),('cancelado'),('pendencia')) AS s(situacao)
    LEFT JOIN (
      SELECT rm.id, rm.valor,
             public.repasse_situacao(rm.asaas_status, rm.erro, ap.status, rm.status) AS situacao
        FROM repasses_medicos rm
        LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = rm.asaas_payment_id
       WHERE (p_medico   IS NULL OR rm.medico_id = p_medico)
         AND (p_origem   IS NULL OR rm.origem = p_origem)
         AND (p_data_ini IS NULL OR rm.data_repasse >= p_data_ini)
         AND (p_data_fim IS NULL OR rm.data_repasse <= p_data_fim)
    ) r ON r.situacao = s.situacao
   GROUP BY s.situacao;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants (o CASCADE derrubou os anteriores junto com as funções).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.repasse_situacao(text, text, text, text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.medico_listar_repasses(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.medico_listar_repasses(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.medico_resumo_financeiro() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.medico_resumo_financeiro() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_medico_repasses(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_medico_repasses(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_repasses(text, text, text, uuid, date, date, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_list_repasses(text, text, text, uuid, date, date, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_repasses_totais(date, date, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_repasses_totais(date, date, uuid, text) TO authenticated;
