-- Este script ajuda a atribuir roles de admin a usuários existentes
-- Você pode executar manualmente para dar acesso admin a um usuário específico

-- Exemplo: Para dar permissão de admin a um usuário pelo email
-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que deve ter acesso admin

-- IMPORTANTE: Execute este comando manualmente no SQL Editor do Supabase
-- substituindo o email pelo usuário correto:

-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'admin'::app_role 
-- FROM auth.users 
-- WHERE email = 'SEU_EMAIL_AQUI'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Para verificar quais usuários existem no sistema:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Para verificar quais usuários já têm roles:
-- SELECT ur.user_id, ur.role, au.email 
-- FROM user_roles ur 
-- JOIN auth.users au ON au.id = ur.user_id;

-- Criar uma função helper para atribuir roles (opcional)
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscar o user_id pelo email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
  END IF;

  -- Inserir a role de admin
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Role admin atribuída ao usuário %', user_email;
END;
$$;