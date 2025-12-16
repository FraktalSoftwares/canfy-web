-- Adicionar role de admin para Jorge
-- Primeiro verificar qual é o Jorge correto baseado no email
DO $$
DECLARE
  jorge_id uuid;
BEGIN
  -- Buscar o ID do Jorge que corresponde ao email
  SELECT id INTO jorge_id 
  FROM auth.users 
  WHERE email = 'jorge.tosta@fraktalsoftwares.com.br';
  
  IF jorge_id IS NOT NULL THEN
    -- Adicionar role de admin se não existir
    INSERT INTO public.user_roles (user_id, role)
    VALUES (jorge_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role added for user: %', jorge_id;
  ELSE
    RAISE NOTICE 'User with email jorge.tosta@fraktalsoftwares.com.br not found';
  END IF;
END $$;