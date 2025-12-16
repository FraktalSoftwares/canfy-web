-- Corrigir tipo de retorno do email na função admin_get_paciente
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    pr.nome_completo,
    (SELECT au.email::text FROM auth.users au WHERE au.id = p.user_id) as email,
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
  WHERE p.id = p_id;
END;
$function$;