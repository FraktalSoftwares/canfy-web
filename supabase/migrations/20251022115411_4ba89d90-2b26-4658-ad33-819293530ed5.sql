-- Corrigir ambiguidade na função admin_list_pacientes
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
    pac.id,
    pac.user_id,
    pr.nome_completo,
    (SELECT au.email FROM auth.users au WHERE au.id = pac.user_id) as email,
    pr.telefone,
    pac.cpf,
    pac.data_nascimento,
    pac.endereco_completo,
    pac.total_consultas,
    pac.total_pedidos,
    pac.ultimo_acesso,
    pac.created_at,
    pr.ativo
  FROM pacientes pac
  INNER JOIN profiles pr ON pr.id = pac.user_id
  ORDER BY pac.created_at DESC;
END;
$function$;