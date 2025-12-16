-- Habilitar realtime para as tabelas principais
ALTER TABLE public.pacientes REPLICA IDENTITY FULL;
ALTER TABLE public.medicos REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.receitas REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.associacoes_marcas REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pacientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receitas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.associacoes_marcas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;