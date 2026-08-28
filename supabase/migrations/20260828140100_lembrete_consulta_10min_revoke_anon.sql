-- O REVOKE ... FROM PUBLIC não bloqueia anon/authenticated neste projeto
-- porque há ALTER DEFAULT PRIVILEGES concedendo EXECUTE a esses roles em
-- toda função nova (mesmo padrão observado em escalonar_fila_consultas e
-- despachar_nivel). Fecha explicitamente para gerar_lembretes_10min_consultas,
-- que é destinada só ao cron (não deve ser invocável via RPC pelo app).
REVOKE EXECUTE ON FUNCTION public.gerar_lembretes_10min_consultas() FROM anon, authenticated;
