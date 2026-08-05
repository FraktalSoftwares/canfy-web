-- Notificações ativas (in-app): aviso de vencimento de receita e lembrete de
-- consulta agendada. Sem push real (FCM/APNs) — apenas grava em `notificacoes`,
-- já lida pela tela de notificações existente do app.

-- Flag de preferência dedicada ao aviso de vencimento de receita (o campo
-- existente tipos_novas_receitas é sobre receitas novas, não sobre expiração).
ALTER TABLE public.preferencias_notificacoes
  ADD COLUMN IF NOT EXISTS tipos_vencimento_receitas boolean NOT NULL DEFAULT true;

-- Evita reenviar o mesmo aviso todo dia.
ALTER TABLE public.receitas
  ADD COLUMN IF NOT EXISTS notificado_vencimento_em timestamptz;
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS notificado_lembrete_em timestamptz;

CREATE OR REPLACE FUNCTION public.gerar_notificacoes_agendadas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aviso de vencimento de receita: receitas ativas que vencem nos próximos
  -- 7 dias, ainda não avisadas, com a preferência habilitada (padrão: sim).
  INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio)
  SELECT
    'sistema',
    'geral',
    'Sua receita está prestes a vencer',
    'A receita válida até ' || to_char(r.validade, 'DD/MM/YYYY') || ' vence em breve. Consulte novamente para renovar.',
    p.user_id,
    'especifico',
    'imediato'
  FROM receitas r
  JOIN pacientes p ON p.id = r.paciente_id
  LEFT JOIN preferencias_notificacoes pn ON pn.user_id = p.user_id
  WHERE r.status = 'ativa'
    AND r.notificado_vencimento_em IS NULL
    AND r.validade <= current_date + interval '7 days'
    AND r.validade >= current_date
    AND coalesce(pn.tipos_vencimento_receitas, true) = true;

  UPDATE receitas r
  SET notificado_vencimento_em = now()
  FROM pacientes p
  WHERE p.id = r.paciente_id
    AND r.status = 'ativa'
    AND r.notificado_vencimento_em IS NULL
    AND r.validade <= current_date + interval '7 days'
    AND r.validade >= current_date;

  -- Lembrete de consulta: consultas agendadas para amanhã, ainda não avisadas,
  -- com a preferência de consultas habilitada (padrão: sim). Avisa paciente e,
  -- se já atribuído, o médico.
  INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio)
  SELECT
    'sistema',
    'geral',
    'Você tem uma consulta amanhã',
    'Consulta agendada para ' || to_char(c.data_consulta AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') || '.',
    dest.user_id,
    'especifico',
    'imediato'
  FROM consultas c
  JOIN pacientes p ON p.id = c.paciente_id
  LEFT JOIN medicos m ON m.id = c.medico_id
  CROSS JOIN LATERAL (VALUES (p.user_id), (m.user_id)) AS dest(user_id)
  LEFT JOIN preferencias_notificacoes pn ON pn.user_id = dest.user_id
  WHERE c.status = 'agendada'
    AND c.notificado_lembrete_em IS NULL
    AND (c.data_consulta AT TIME ZONE 'America/Sao_Paulo')::date = current_date + 1
    AND dest.user_id IS NOT NULL
    AND coalesce(pn.tipos_consultas, true) = true;

  UPDATE consultas c
  SET notificado_lembrete_em = now()
  WHERE c.status = 'agendada'
    AND c.notificado_lembrete_em IS NULL
    AND (c.data_consulta AT TIME ZONE 'America/Sao_Paulo')::date = current_date + 1;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'gerar-notificacoes-diarias';

SELECT cron.schedule(
  'gerar-notificacoes-diarias',
  '0 11 * * *', -- 11:00 UTC = 08:00 America/Sao_Paulo
  $$SELECT public.gerar_notificacoes_agendadas();$$
);
