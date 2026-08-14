-- QA: a bolinha de notificação não some porque a tabela notificacoes nunca
-- foi adicionada à publicação supabase_realtime, então o canal do Navbar
-- (postgres_changes) nunca dispara e a contagem só é refeita com F5.
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
