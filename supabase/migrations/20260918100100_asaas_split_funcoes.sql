-- Split de pagamentos Asaas: funções de cálculo, derivação de situação e RPCs.
--
-- Dois princípios que atravessam o arquivo:
--   1. Nada de fallback silencioso no caminho do dinheiro. Configuração ausente
--      levanta exceção em vez de virar comissão zero gravada como se fosse certa.
--   2. Configuração é viva, histórico é imutável: percentual e base_calculo são
--      congelados no repasse, então alterar a configuração nunca reescreve o que
--      já foi gerado.
--
-- Pré-requisito: secrets 'project_url' e 'cron_dispatch_secret' no Vault.

-- ---------------------------------------------------------------------------
-- 1. Derivação da situação.
--    repasses_medicos.status só tem 3 valores e mistura "o paciente ainda não
--    pagou" com "o dinheiro está aqui e precisa sair". A situacao separa os dois
--    sem migrar o enum nem quebrar quem já lê status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repasse_situacao(
  p_asaas_status     text,
  p_erro             text,
  p_pagamento_status text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    -- Precedência: o que não sai sozinho aparece primeiro.
    WHEN p_erro IS NOT NULL AND btrim(p_erro) <> ''        THEN 'pendencia'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('REFUSED','FAILED')       THEN 'pendencia'
    WHEN upper(coalesce(p_asaas_status,'')) = 'DONE'                      THEN 'pago'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('CANCELLED','REFUNDED')   THEN 'cancelado'
    WHEN upper(coalesce(p_asaas_status,'')) IN ('AWAITING_CREDIT','BANK_PROCESSING') THEN 'em_transferencia'
    -- Ainda não saiu: depende de a Canfy já ter recebido do paciente.
    WHEN upper(coalesce(p_pagamento_status,'')) IN ('RECEIVED','CONFIRMED') THEN 'a_transferir'
    ELSE 'aguardando_pagamento'
  END;
$function$;

COMMENT ON FUNCTION public.repasse_situacao(text, text, text) IS
  'Fonte única da situação de um repasse (aguardando_pagamento|a_transferir|em_transferencia|pago|cancelado|pendencia). Usada por todas as RPCs para que médico e admin nunca divirjam.';

-- ---------------------------------------------------------------------------
-- 2. Repasse de consulta.
--    A consulta não usa split: no momento da cobrança o médico ainda não existe
--    (a consulta entra numa fila e só depois alguém a assume). O dinheiro sai
--    por transferência entre contas Asaas quando a consulta é finalizada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_repasse_consulta(p_consulta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico_id   uuid;
  v_base        numeric(10,2);
  v_percentual  numeric(5,2);
  v_valor       numeric(10,2);
  v_wallet      text;
  v_onboarding  text;
  v_payment_id  text;
  v_erro        text;
  v_repasse_id  uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM repasses_medicos WHERE consulta_id = p_consulta_id) THEN
    RETURN NULL;
  END IF;

  SELECT c.medico_id, c.valor INTO v_medico_id, v_base
    FROM consultas c WHERE c.id = p_consulta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta % não encontrada.', p_consulta_id;
  END IF;
  IF v_medico_id IS NULL THEN
    RAISE EXCEPTION 'Consulta % não tem médico atribuído; não há a quem repassar.', p_consulta_id;
  END IF;
  IF v_base IS NULL OR v_base <= 0 THEN
    RAISE EXCEPTION 'Consulta % não tem valor registrado; não é possível calcular o repasse.', p_consulta_id;
  END IF;

  -- Override do médico tem precedência sobre o global. Ambos lidos agora,
  -- em tempo de execução — nunca hardcoded, nunca exigindo deploy.
  SELECT COALESCE(m.percentual_repasse_consulta, cs.percentual_repasse_consulta),
         m.asaas_wallet_id,
         m.asaas_onboarding_status
    INTO v_percentual, v_wallet, v_onboarding
    FROM medicos m
    CROSS JOIN configuracoes_sistema cs
   WHERE m.id = v_medico_id AND cs.id = 1;

  IF v_percentual IS NULL THEN
    RAISE EXCEPTION 'configuracoes_sistema (id=1) não encontrada ou sem percentual_repasse_consulta.';
  END IF;

  v_valor := ROUND(v_base * v_percentual / 100, 2);
  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'Repasse calculado para a consulta % ficou em zero (base R$ %, percentual %).',
      p_consulta_id, v_base, v_percentual;
  END IF;

  -- Impedimentos conhecidos viram "pendencia" visível, não silêncio.
  IF v_wallet IS NULL THEN
    v_erro := 'Médico sem carteira Asaas: o repasse não pode ser transferido automaticamente.';
  ELSIF v_onboarding IS DISTINCT FROM 'aprovado' THEN
    v_erro := format('Subconta Asaas do médico não aprovada (status: %s).', COALESCE(v_onboarding, 'desconhecido'));
  END IF;

  SELECT ap.asaas_payment_id INTO v_payment_id
    FROM asaas_payments ap
   WHERE ap.reference_type = 'consultation'
     AND ap.reference_id = p_consulta_id::text
   ORDER BY ap.created_at DESC
   LIMIT 1;

  INSERT INTO repasses_medicos (
    medico_id, consulta_id, origem, valor, status, asaas_status,
    asaas_payment_id, percentual, base_calculo, erro, observacao
  )
  VALUES (
    v_medico_id, p_consulta_id, 'consulta', v_valor, 'pendente', 'PENDING',
    v_payment_id, v_percentual, v_base, v_erro,
    format('Repasse de %s%% sobre R$ %s (consulta finalizada)', v_percentual, v_base)
  )
  ON CONFLICT (consulta_id) WHERE consulta_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_repasse_id;

  RETURN v_repasse_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Gatilho da consulta finalizada.
--    Nunca bloqueia o encerramento do atendimento por causa do financeiro, mas
--    também nunca perde o repasse em silêncio: a falha vira uma linha em
--    pendencia, visível no admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_consulta_finalizada_gerar_repasse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_repasse_id uuid;
  v_url        text;
  v_secret     text;
BEGIN
  BEGIN
    v_repasse_id := public.gerar_repasse_consulta(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    IF NEW.medico_id IS NOT NULL THEN
      INSERT INTO repasses_medicos (medico_id, consulta_id, origem, valor, status, erro, observacao)
      VALUES (NEW.medico_id, NEW.id, 'consulta', 0, 'pendente', SQLERRM,
              'Falha ao calcular o repasse desta consulta')
      ON CONFLICT (consulta_id) WHERE consulta_id IS NOT NULL DO NOTHING;
    ELSE
      RAISE WARNING 'Repasse da consulta % não pôde ser registrado: %', NEW.id, SQLERRM;
    END IF;
    RETURN NULL;
  END;

  IF v_repasse_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    UPDATE repasses_medicos
       SET erro = 'Vault sem project_url/cron_dispatch_secret: transferência não pôde ser disparada.'
     WHERE id = v_repasse_id;
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/asaas-transferir-repasse',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := jsonb_build_object('repasse_id', v_repasse_id)
  );

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS consulta_finalizada_gerar_repasse ON public.consultas;
CREATE TRIGGER consulta_finalizada_gerar_repasse
AFTER UPDATE OF status ON public.consultas
FOR EACH ROW
WHEN (NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_consulta_finalizada_gerar_repasse();

-- ---------------------------------------------------------------------------
-- 4. Comissão de pedido: a geração passa para o momento da cobrança.
--    Com split, o Asaas credita o médico quando a cobrança é recebida, então
--    gerar o repasse só na entrega ficaria atrasado e duplicado. A trigger sai;
--    gerar_repasse_pedido permanece para backfill e reprocesso manual.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS pedido_entregue_gerar_repasse ON public.pedidos;

CREATE OR REPLACE FUNCTION public.gerar_repasse_pedido(p_pedido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_medico_id   uuid;
  v_base        numeric(10,2);
  v_percentual  numeric(5,2);
  v_valor       numeric(10,2);
  v_wallet      text;
  v_onboarding  text;
  v_payment_id  text;
  v_erro        text;
  v_repasse_id  uuid;
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

  -- Antes isto era RETURN NULL: a comissão simplesmente não existia e ninguém
  -- ficava sabendo. Pedido sem receita é um problema de dado, não um caso normal.
  IF v_medico_id IS NULL THEN
    RAISE EXCEPTION 'Pedido % não tem receita vinculada; não há médico a quem repassar.', p_pedido_id;
  END IF;

  SELECT COALESCE(m.percentual_comissao_pedido, cs.percentual_comissao_medico),
         m.asaas_wallet_id,
         m.asaas_onboarding_status
    INTO v_percentual, v_wallet, v_onboarding
    FROM medicos m
    CROSS JOIN configuracoes_sistema cs
   WHERE m.id = v_medico_id AND cs.id = 1;

  -- Antes: COALESCE(percentual_comissao_medico, 0), que mascarava a tabela de
  -- configuração ausente e gravava comissão zero como se estivesse correta.
  IF v_percentual IS NULL THEN
    RAISE EXCEPTION 'configuracoes_sistema (id=1) não encontrada ou sem percentual_comissao_medico.';
  END IF;

  v_valor := ROUND(v_base * v_percentual / 100, 2);
  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'Comissão calculada para o pedido % ficou em zero (base R$ %, percentual %).',
      p_pedido_id, v_base, v_percentual;
  END IF;

  IF v_wallet IS NULL THEN
    v_erro := 'Médico sem carteira Asaas: a comissão não pôde ser repassada automaticamente.';
  ELSIF v_onboarding IS DISTINCT FROM 'aprovado' THEN
    v_erro := format('Subconta Asaas do médico não aprovada (status: %s).', COALESCE(v_onboarding, 'desconhecido'));
  END IF;

  SELECT ap.asaas_payment_id INTO v_payment_id
    FROM asaas_payments ap
   WHERE ap.reference_type = 'order'
     AND ap.reference_id = p_pedido_id::text
   ORDER BY ap.created_at DESC
   LIMIT 1;

  INSERT INTO repasses_medicos (
    medico_id, pedido_id, origem, valor, status, asaas_status,
    asaas_payment_id, percentual, base_calculo, erro, observacao
  )
  VALUES (
    v_medico_id, p_pedido_id, 'pedido', v_valor, 'pendente', 'PENDING',
    v_payment_id, v_percentual, v_base, v_erro,
    format('Comissão de %s%% sobre R$ %s', v_percentual, v_base)
  )
  ON CONFLICT (pedido_id) WHERE pedido_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_repasse_id;

  RETURN v_repasse_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. RPCs do app do médico. Mudam de assinatura (ganham situacao e os campos de
--    auditoria), por isso precisam de DROP antes do CREATE.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.medico_listar_repasses(integer);
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
         public.repasse_situacao(r.asaas_status, r.erro, ap.status),
         r.origem, r.observacao, r.pedido_id, r.consulta_id,
         r.percentual, r.base_calculo, r.pago_em, r.erro
    FROM repasses_medicos r
    LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
   WHERE r.medico_id = v_medico
   ORDER BY r.data_repasse DESC, r.created_at DESC
   LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

DROP FUNCTION IF EXISTS public.medico_resumo_financeiro();
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
           public.repasse_situacao(r.asaas_status, r.erro, ap.status) AS situacao
      FROM repasses_medicos r
      LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
     WHERE r.medico_id = v_medico
  )
  SELECT
    -- total_recebido/total_pendente permanecem para compatibilidade.
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

-- ---------------------------------------------------------------------------
-- 6. RPCs do admin.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_medico_repasses(uuid);
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
         public.repasse_situacao(r.asaas_status, r.erro, ap.status),
         r.origem, r.observacao, r.percentual, r.base_calculo, r.pago_em, r.erro
    FROM repasses_medicos r
    LEFT JOIN asaas_payments ap ON ap.asaas_payment_id = r.asaas_payment_id
   WHERE r.medico_id = p_medico_id
   ORDER BY r.data_repasse DESC, r.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_repasses(
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
           public.repasse_situacao(r.asaas_status, r.erro, ap.status) AS situacao,
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

CREATE OR REPLACE FUNCTION public.admin_repasses_totais(
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
             public.repasse_situacao(rm.asaas_status, rm.erro, ap.status) AS situacao
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

-- Reprocesso: limpa o impedimento e redispara a transferência. Vale para as duas
-- origens — uma comissão de pedido cujo split não saiu também é paga por
-- transferência, já que não dá para anexar split a cobrança já recebida.
CREATE OR REPLACE FUNCTION public.admin_repasse_reprocessar(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url    text;
  v_secret text;
  v_status text;
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para reprocessar repasses.';
  END IF;

  SELECT rm.status INTO v_status FROM repasses_medicos rm WHERE rm.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repasse não encontrado.';
  END IF;
  IF v_status <> 'pendente' THEN
    RAISE EXCEPTION 'Apenas repasses pendentes podem ser reprocessados (status atual: %).', v_status;
  END IF;

  UPDATE repasses_medicos SET erro = NULL WHERE id = p_id;

  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault sem project_url/cron_dispatch_secret: não é possível disparar a transferência.';
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/asaas-transferir-repasse',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := jsonb_build_object('repasse_id', p_id)
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Configuração do sistema: expor os campos novos.
--    Sem isto as colunas existem no banco mas não são editáveis pela tela, e a
--    configuração volta a depender de SQL manual — exatamente o que se quer evitar.
--    Mudam de assinatura, portanto DROP antes do CREATE.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_configuracoes_sistema();
CREATE FUNCTION public.admin_get_configuracoes_sistema()
RETURNS TABLE(
  percentual_comissao_medico       numeric,
  percentual_repasse_consulta      numeric,
  valor_consulta_padrao            numeric,
  taxa_pedido                      numeric,
  asaas_split_ativo                boolean,
  frete_internacional              numeric,
  prazo_entrega_internacional_dias integer,
  feriados                         date[],
  melhor_envio_cep_origem          text,
  melhor_envio_sandbox             boolean,
  melhor_envio_remetente           jsonb,
  updated_at                       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    cs.percentual_comissao_medico,
    cs.percentual_repasse_consulta,
    cs.valor_consulta_padrao,
    cs.taxa_pedido,
    cs.asaas_split_ativo,
    cs.frete_internacional,
    cs.prazo_entrega_internacional_dias,
    cs.feriados,
    cs.melhor_envio_cep_origem,
    cs.melhor_envio_sandbox,
    cs.melhor_envio_remetente,
    cs.updated_at
  FROM public.configuracoes_sistema cs
  WHERE cs.id = 1;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_update_configuracoes_sistema(numeric, numeric, numeric, numeric, integer, date[], text, boolean, jsonb);
CREATE FUNCTION public.admin_update_configuracoes_sistema(
  p_percentual_comissao   numeric,
  p_valor_consulta        numeric,
  p_taxa_pedido           numeric,
  p_frete_intl            numeric,
  p_prazo_intl            integer,
  p_feriados              date[],
  p_me_cep_origem         text    DEFAULT NULL,
  p_me_sandbox            boolean DEFAULT NULL,
  p_me_remetente          jsonb   DEFAULT NULL,
  p_percentual_consulta   numeric DEFAULT NULL,
  p_asaas_split_ativo     boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'acessos', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar configurações do sistema.';
  END IF;

  UPDATE public.configuracoes_sistema SET
    percentual_comissao_medico  = p_percentual_comissao,
    valor_consulta_padrao       = p_valor_consulta,
    taxa_pedido                 = p_taxa_pedido,
    frete_internacional         = p_frete_intl,
    prazo_entrega_internacional_dias = p_prazo_intl,
    feriados                    = p_feriados,
    melhor_envio_cep_origem     = COALESCE(p_me_cep_origem, melhor_envio_cep_origem),
    melhor_envio_sandbox        = COALESCE(p_me_sandbox,    melhor_envio_sandbox),
    melhor_envio_remetente      = COALESCE(p_me_remetente,  melhor_envio_remetente),
    percentual_repasse_consulta = COALESCE(p_percentual_consulta, percentual_repasse_consulta),
    asaas_split_ativo           = COALESCE(p_asaas_split_ativo,   asaas_split_ativo),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1;
END;
$function$;
