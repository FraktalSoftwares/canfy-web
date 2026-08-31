-- Fecha o acesso indevido das funções de repasse criadas em
-- 20260831180000_repasse_medico_status.sql e 20260831190000_gerar_repasses_medicos.sql.
--
-- Duas camadas concedem EXECUTE sem a gente pedir:
--   1. o Postgres concede EXECUTE a PUBLIC em toda função nova;
--   2. o Supabase expõe o schema `public` via REST para `anon`/`authenticated`.
-- Por isso é preciso revogar de PUBLIC (senão anon herda por lá) e só então
-- conceder nominalmente a quem precisa. Mesma ideia de
-- 20260828135102_lembrete_consulta_10min_revoke_anon.sql.

-- Internas: chamadas pelo trigger com privilégio do owner, nunca via REST.
-- Não têm checagem de permissão própria — se expostas, qualquer visitante
-- poderia criar repasses.
REVOKE EXECUTE ON FUNCTION public.gerar_repasse_pedido(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pedido_entregue_gerar_repasse() FROM PUBLIC, anon, authenticated;

-- RPCs do app do médico: exigem sessão (medico_atual_id() -> auth.uid()).
REVOKE EXECUTE ON FUNCTION public.medico_listar_repasses(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.medico_resumo_financeiro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medico_listar_repasses(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.medico_resumo_financeiro() TO authenticated;

-- Painel admin: gateada por has_permission(auth.uid(), 'usuarios', 'editar'),
-- que já retorna false para uid NULL — mas anon não precisa executar.
REVOKE EXECUTE ON FUNCTION public.admin_update_repasse_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_repasse_status(uuid, text) TO authenticated;
