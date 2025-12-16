-- Create function to list all patients (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_pacientes()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  endereco_completo text,
  total_consultas integer,
  total_pedidos integer,
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone,
  ativo boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    pr.nome_completo,
    (SELECT email FROM auth.users WHERE id = p.user_id) as email,
    pr.telefone,
    p.cpf,
    p.data_nascimento,
    p.endereco_completo,
    p.total_consultas,
    p.total_pedidos,
    p.ultimo_acesso,
    p.created_at,
    pr.ativo
  FROM pacientes p
  INNER JOIN profiles pr ON pr.id = p.user_id
  ORDER BY p.created_at DESC
$$;

-- Create function to get a single patient (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_paciente(p_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  endereco_completo text,
  total_consultas integer,
  total_pedidos integer,
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone,
  ativo boolean,
  foto_perfil_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    pr.nome_completo,
    (SELECT email FROM auth.users WHERE id = p.user_id) as email,
    pr.telefone,
    p.cpf,
    p.data_nascimento,
    p.endereco_completo,
    p.total_consultas,
    p.total_pedidos,
    p.ultimo_acesso,
    p.created_at,
    pr.ativo,
    pr.foto_perfil_url
  FROM pacientes p
  INNER JOIN profiles pr ON pr.id = p.user_id
  WHERE p.id = p_id
$$;

-- Create function to update patient data (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_paciente(
  p_id uuid,
  p_telefone text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_data_nascimento date DEFAULT NULL,
  p_endereco_completo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from paciente
  SELECT user_id INTO v_user_id FROM pacientes WHERE id = p_id;
  
  -- Update pacientes table
  UPDATE pacientes
  SET 
    cpf = COALESCE(p_cpf, cpf),
    data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
    endereco_completo = COALESCE(p_endereco_completo, endereco_completo),
    updated_at = NOW()
  WHERE id = p_id;
  
  -- Update profiles table (telefone)
  UPDATE profiles
  SET
    telefone = COALESCE(p_telefone, telefone),
    updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;

-- Create function to inactivate patient (admin only)
CREATE OR REPLACE FUNCTION public.admin_inativar_paciente(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from paciente
  SELECT user_id INTO v_user_id FROM pacientes WHERE id = p_id;
  
  -- Inactivate in profiles table
  UPDATE profiles
  SET ativo = false, updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;