-- Lembrete de consulta 10 minutos antes do horário agendado (item da pauta
-- de 2026-08-28: "notificação 10 minutos antes" + libera o botão "Iniciar
-- consulta" no app, que já é feito client-side comparando data_consulta).
--
-- Segue o mesmo padrão de `gerar_notificacoes_agendadas` (lembrete de
-- véspera) e reaproveita `enviar_push_async` (push via Edge Function
-- enviar-push, já usada pelo motor de fila de prioridade).

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS notificado_10min_em timestamptz;

CREATE OR REPLACE FUNCTION public.gerar_lembretes_10min_consultas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_titulo text := 'Sua consulta vai começar';
  v_desc text;
BEGIN
  FOR r IN
    SELECT c.id, c.data_consulta, p.user_id AS paciente_user_id, m.user_id AS medico_user_id
    FROM consultas c
    JOIN pacientes p ON p.id = c.paciente_id
    LEFT JOIN medicos m ON m.id = c.medico_id
    WHERE c.status IN ('agendada', 'em_andamento')
      AND c.notificado_10min_em IS NULL
      AND c.data_consulta <= now() + interval '10 minutes'
      AND c.data_consulta >= now() - interval '1 minute'
  LOOP
    v_desc := 'Sua consulta agendada para ' ||
      to_char(r.data_consulta AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') ||
      ' vai começar em instantes. Toque para entrar.';

    IF r.paciente_user_id IS NOT NULL THEN
      INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio, rota, rota_params)
      VALUES ('sistema', 'geral', v_titulo, v_desc, r.paciente_user_id, 'especifico', 'imediato',
              '/patient/consultations', jsonb_build_object('consultaId', r.id));

      PERFORM public.enviar_push_async(
        r.paciente_user_id, v_titulo, v_desc,
        jsonb_build_object('consultaId', r.id::text, 'rota', '/patient/consultations')
      );
    END IF;

    IF r.medico_user_id IS NOT NULL THEN
      INSERT INTO notificacoes (tipo, categoria, titulo, descricao, destinatario_id, destinatario_tipo, tipo_envio, rota, rota_params)
      VALUES ('sistema', 'geral', v_titulo, v_desc, r.medico_user_id, 'especifico', 'imediato',
              '/appointment', jsonb_build_object('consultaId', r.id));

      PERFORM public.enviar_push_async(
        r.medico_user_id, v_titulo, v_desc,
        jsonb_build_object('consultaId', r.id::text, 'rota', '/appointment')
      );
    END IF;

    UPDATE consultas SET notificado_10min_em = now() WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_lembretes_10min_consultas() FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lembrete-consulta-10min';

SELECT cron.schedule(
  'lembrete-consulta-10min',
  '* * * * *', -- a cada minuto
  $$SELECT public.gerar_lembretes_10min_consultas();$$
);
