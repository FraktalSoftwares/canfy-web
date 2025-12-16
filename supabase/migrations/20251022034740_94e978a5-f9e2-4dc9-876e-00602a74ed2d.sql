-- Adicionar usuário atual como super_admin
-- Substitua o UUID pelo ID do usuário jorge.tosta@fraktalsoftwares.com.br
INSERT INTO public.user_roles (user_id, role)
VALUES ('f6d1b7e7-d478-41db-bd7b-2f599b2fd6ca', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;