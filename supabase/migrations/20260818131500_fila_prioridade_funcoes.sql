-- Motor de despacho por nível de prioridade para consultas sem médico
-- (discovery: board FigJam 9sSwRN9A4CYPH3JuiQDIPX, nó 1208:4019).
--
-- Níveis 1-4 seguem a tabela do discovery (queixas atendidas × disponibilidade
-- no dia/horário). Nível 5 é uma rede de segurança adicionada nesta
-- implementação: sem ele, consultas cujo paciente ou médico tenham dados de
-- queixas/sintomas ausentes (comum hoje: ~80% dos médicos sem
-- queixas_atendidas cadastradas) nunca cairiam em nenhum nível e seriam
-- sempre reembolsadas aos 30min por falta de dado, não por falta de médico.
--
-- Pré-requisito: secrets 'project_url' e 'cron_dispatch_secret' no Vault
-- (criados fora desta migration) e o secret CRON_DISPATCH_SECRET configurado
-- nas Edge Functions (dashboard) com o mesmo valor do vault.

-- Médicos elegíveis para um nível específico, dada uma consulta.
CREATE OR REPLACE FUNCTION public.medicos_elegiveis_nivel(p_consulta_id uuid, p_nivel int)
RETURNS TABLE(medico_id uuid, medico_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT id, data_consulta, coalesce(sintomas, '{}'::text[]) AS sintomas
    FROM consultas WHERE id = p_consulta_id
  ),
  cand AS (
    SELECT
      m.id AS medico_id,
      m.user_id AS medico_user_id,
      cardinality(
        ARRAY(
          SELECT unnest(c.sintomas)
          INTERSECT
          SELECT unnest(coalesce(m.queixas_atendidas, '{}'::text[]))
        )
      ) AS match_count,
      EXISTS (
        SELECT 1
        WHERE m.disponibilidade_dias IS NOT NULL
          AND m.disponibilidade_horarios IS NOT NULL
          AND public.dia_semana_pt((c.data_consulta AT TIME ZONE 'America/Sao_Paulo')::date)
              = ANY(string_to_array(m.disponibilidade_dias, ','))
          AND to_char(c.data_consulta AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"MI')
              = ANY(SELECT trim(x) FROM unnest(string_to_array(m.disponibilidade_horarios, ',')) AS x)
      ) AS disponivel
    FROM medicos m, c
    WHERE m.status = 'ativo'
      AND coalesce(m.modo_ferias, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM consultas c2
        WHERE c2.medico_id = m.id
          AND c2.status IN ('agendada', 'em_andamento')
          AND c2.data_consulta = c.data_consulta
      )
  )
  SELECT medico_id, medico_user_id
  FROM cand
  WHERE
    (p_nivel = 1 AND match_count = 2 AND disponivel)
    OR (p_nivel = 2 AND match_count = 1 AND disponivel)
    OR (p_nivel = 3 AND match_count = 2 AND NOT disponivel)
    OR (p_nivel = 4 AND match_count = 1 AND NOT disponivel)
    OR (p_nivel = 5 AND match_count = 0);
$$;

REVOKE EXECUTE ON FUNCTION public.medicos_elegiveis_nivel(uuid, int) FROM PUBLIC;

-- Um médico pode assumir a consulta agora se já foi despachado algum nível
-- em que ele é elegível.
CREATE OR REPLACE FUNCTION public.medico_elegivel_agora(p_consulta_id uuid, p_medico_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM consultas c, jsonb_array_elements_text(c.notificados_nivel) AS lvl(val)
    WHERE c.id = p_consulta_id
      AND val ~ '^\d+$'
      AND EXISTS (
        SELECT 1 FROM public.medicos_elegiveis_nivel(p_consulta_id, val::int) e
        WHERE e.medico_id = p_medico_id
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.medico_elegivel_agora(uuid, uuid) FROM PUBLIC;

-- Envia push de forma assíncrona (pg_net) via Edge Function 'enviar-push'.
-- Nunca lança exceção — falha de rede/push não pode derrubar o despacho.
CREATE OR REPLACE FUNCTION public.enviar_push_async(p_user_id uuid, p_titulo text, p_corpo text, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/enviar-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('userId', p_user_id, 'titulo', p_titulo, 'corpo', p_corpo, 'data', p_data)
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_push_async(uuid, text, text, jsonb) FROM PUBLIC;

-- Dispara o nível N para uma consulta: notifica (in-app + push) todo médico
-- elegível para esse nível e marca o nível como processado.
CREATE OR REPLACE FUNCTION public.despachar_nivel(p_consulta_id uuid, p_nivel int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_titulo text := 'Nova consulta disponível';
  v_desc text := CASE
    WHEN p_nivel = 5 THEN 'Uma consulta está aguardando atendimento — toque para assumir.'
    ELSE 'Uma nova consulta compatível com seu perfil está aguardando atendimento.'
  END;
BEGIN
  FOR r IN SELECT medico_id, medico_user_id FROM public.medicos_elegiveis_nivel(p_consulta_id, p_nivel) LOOP
    INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio, rota, rota_params)
    VALUES ('sistema', 'engajamento', v_titulo, v_desc, r.medico_user_id, 'especifico', 'imediato',
            '/appointment', jsonb_build_object('consultaId', p_consulta_id, 'naFila', true));

    PERFORM public.enviar_push_async(
      r.medico_user_id, v_titulo, v_desc,
      jsonb_build_object('consultaId', p_consulta_id::text, 'rota', '/appointment')
    );
  END LOOP;

  UPDATE consultas
  SET notificados_nivel = notificados_nivel || to_jsonb(p_nivel)
  WHERE id = p_consulta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.despachar_nivel(uuid, int) FROM PUBLIC;

-- Consulta ficou 30min sem nenhum médico aceitar: expira, reembolsa
-- automaticamente (via Edge Function asaas-refund-payment, autenticada por
-- segredo de serviço) e avisa o paciente.
CREATE OR REPLACE FUNCTION public.expirar_consulta_sem_medico(p_consulta_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paciente_user_id uuid;
  v_asaas_payment_id text;
  v_url text;
  v_secret text;
BEGIN
  UPDATE consultas
  SET status = 'expirada',
      reembolsada_em = now(),
      notificados_nivel = notificados_nivel || '["expirada"]'::jsonb
  WHERE id = p_consulta_id AND medico_id IS NULL AND status = 'agendada';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT p.user_id INTO v_paciente_user_id
  FROM consultas c JOIN pacientes p ON p.id = c.paciente_id
  WHERE c.id = p_consulta_id;

  INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio, rota, rota_params)
  VALUES ('sistema', 'alertas_tecnicos',
    'Não conseguimos encontrar um médico disponível',
    'Nenhum médico aceitou sua consulta a tempo. O valor pago foi estornado automaticamente — você pode reagendar em outro dia ou horário.',
    v_paciente_user_id, 'especifico', 'imediato',
    '/patient/consultations', jsonb_build_object('consultaId', p_consulta_id, 'expirada', true));

  PERFORM public.enviar_push_async(
    v_paciente_user_id, 'Consulta não confirmada',
    'Nenhum médico aceitou a tempo. Reembolso automático realizado.',
    jsonb_build_object('consultaId', p_consulta_id::text, 'rota', '/patient/consultations')
  );

  SELECT ap.asaas_payment_id INTO v_asaas_payment_id
  FROM asaas_payments ap
  WHERE ap.reference_type = 'consultation' AND ap.reference_id = p_consulta_id::text
  ORDER BY ap.created_at DESC
  LIMIT 1;

  IF v_asaas_payment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/asaas-refund-payment',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('asaas_payment_id', v_asaas_payment_id)
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expirar_consulta_sem_medico(uuid) FROM PUBLIC;

-- Ponto de entrada do cron (chamado a cada minuto): avança o nível de cada
-- consulta pendente conforme o tempo decorrido desde fila_desde, e expira +
-- reembolsa após 30min sem aceite.
--
-- Janela: nível1 imediato (trigger de INSERT) | nível2 aos 2min |
-- nível3 aos 12min | nível4 aos 22min | nível5 (generalista) aos 26min |
-- expira+reembolsa aos 30min.
CREATE OR REPLACE FUNCTION public.escalonar_fila_consultas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_min numeric;
BEGIN
  FOR r IN
    SELECT id, fila_desde, notificados_nivel
    FROM consultas
    WHERE medico_id IS NULL AND status = 'agendada' AND fila_desde IS NOT NULL
  LOOP
    v_min := EXTRACT(EPOCH FROM (now() - r.fila_desde)) / 60.0;

    IF v_min >= 2 AND NOT (r.notificados_nivel @> '[2]') THEN
      PERFORM public.despachar_nivel(r.id, 2);
    END IF;
    IF v_min >= 12 AND NOT (r.notificados_nivel @> '[3]') THEN
      PERFORM public.despachar_nivel(r.id, 3);
    END IF;
    IF v_min >= 22 AND NOT (r.notificados_nivel @> '[4]') THEN
      PERFORM public.despachar_nivel(r.id, 4);
    END IF;
    IF v_min >= 26 AND NOT (r.notificados_nivel @> '[5]') THEN
      PERFORM public.despachar_nivel(r.id, 5);
    END IF;
    IF v_min >= 30 THEN
      PERFORM public.expirar_consulta_sem_medico(r.id);
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.escalonar_fila_consultas() FROM PUBLIC;

-- Substitui o broadcast antigo (notificava TODOS os médicos ativos) pelo
-- despacho do nível 1, imediato na criação da consulta.
CREATE OR REPLACE FUNCTION public.notify_medicos_nova_consulta_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.medico_id IS NULL THEN
    PERFORM public.despachar_nivel(NEW.id, 1);
  END IF;
  RETURN NEW;
END;
$$;

-- medico_assumir_consulta agora exige que o médico esteja elegível em algum
-- nível já despachado para a consulta (gate por prioridade/tempo).
CREATE OR REPLACE FUNCTION public.medico_assumir_consulta(p_consulta_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_medico uuid;
BEGIN
  v_medico := public.medico_atual_id();
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT public.medico_elegivel_agora(p_consulta_id, v_medico) THEN
    RAISE EXCEPTION 'ainda não é sua vez nesta fila';
  END IF;

  UPDATE consultas
  SET medico_id = v_medico, updated_at = now()
  WHERE id = p_consulta_id AND medico_id IS NULL AND status = 'agendada';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'consulta indisponivel';
  END IF;
END;
$$;

-- medico_listar_atendimentos ganha `sintomas` (a fila hoje não mostra a
-- queixa) e, na fila, só lista consultas em que o médico já está elegível
-- (nível dele já foi despachado) — evita mostrar itens que ele não pode
-- assumir ainda.
DROP FUNCTION IF EXISTS public.medico_listar_atendimentos(text, boolean, integer);

CREATE FUNCTION public.medico_listar_atendimentos(p_status text DEFAULT NULL, p_incluir_fila boolean DEFAULT false, p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, data_consulta timestamptz, status text, queixa_principal text, eh_retorno boolean, paciente_id uuid, paciente_nome text, receita_id uuid, na_fila boolean, sintomas text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_medico uuid;
BEGIN
  v_medico := public.medico_atual_id();
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT c.id, c.data_consulta, c.status::text, c.queixa_principal, c.eh_retorno,
         c.paciente_id, pr.nome_completo, c.receita_id,
         (c.medico_id IS NULL) AS na_fila,
         c.sintomas
  FROM consultas c
  JOIN pacientes pac ON pac.id = c.paciente_id
  JOIN profiles pr ON pr.id = pac.user_id
  WHERE (c.medico_id = v_medico
      OR (p_incluir_fila AND c.medico_id IS NULL AND c.status = 'agendada'
          AND public.medico_elegivel_agora(c.id, v_medico)))
    AND (p_status IS NULL OR c.status::text = p_status)
  ORDER BY c.data_consulta DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.medico_listar_atendimentos(text, boolean, integer) TO authenticated;
