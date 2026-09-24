-- Fecha o acesso às funções criadas em 20260918100100.
--
-- O Postgres concede EXECUTE a PUBLIC em toda função nova e o Supabase expõe o
-- schema public via REST: sem este arquivo, qualquer chave anônima poderia
-- chamar gerar_repasse_consulta ou ler a configuração financeira.
--
-- Também reconcede as funções que sofreram DROP + CREATE na migração anterior —
-- o DROP leva junto os GRANTs antigos, e sem isto a tela de configurações e o
-- app do médico param de funcionar.

-- ---------------------------------------------------------------------------
-- 1. Internas: ninguém chama de fora. São usadas dentro de funções
--    SECURITY DEFINER ou por triggers, que não passam por estes GRANTs.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.repasse_situacao(text, text, text)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_repasse_consulta(uuid)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_repasse_pedido(uuid)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_consulta_finalizada_gerar_repasse()     FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPCs do app do médico: autenticado; a própria função resolve o médico via
--    medico_atual_id() e levanta exceção para quem não for médico.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.medico_listar_repasses(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.medico_listar_repasses(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.medico_resumo_financeiro() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.medico_resumo_financeiro() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPCs do admin: autenticado; cada uma checa has_role/has_permission por dentro.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_get_medico_repasses(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_medico_repasses(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_repasses(text, text, text, uuid, date, date, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_list_repasses(text, text, text, uuid, date, date, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_repasses_totais(date, date, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_repasses_totais(date, date, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_repasse_reprocessar(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_repasse_reprocessar(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Configuração do sistema (recriadas com assinatura nova).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_get_configuracoes_sistema() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_configuracoes_sistema() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_configuracoes_sistema(numeric, numeric, numeric, numeric, integer, date[], text, boolean, jsonb, numeric, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_update_configuracoes_sistema(numeric, numeric, numeric, numeric, integer, date[], text, boolean, jsonb, numeric, boolean) TO authenticated;
