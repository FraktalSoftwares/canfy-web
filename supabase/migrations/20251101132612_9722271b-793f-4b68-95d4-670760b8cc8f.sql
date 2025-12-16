-- Função para inserir registros faltantes em pacientes para usuários existentes
CREATE OR REPLACE FUNCTION public.admin_fix_missing_pacientes()
RETURNS TABLE(user_id uuid, email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verifica permissão admin
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Insere registros faltantes e retorna os usuários corrigidos
  RETURN QUERY
  WITH pacientes_faltantes AS (
    INSERT INTO pacientes (user_id, cpf, data_nascimento, endereco_completo)
    SELECT 
      p.id,
      '00000000000',
      '2000-01-01'::date,
      NULL
    FROM profiles p
    LEFT JOIN pacientes pac ON pac.user_id = p.id
    WHERE p.tipo_usuario = 'paciente' 
      AND pac.id IS NULL
    RETURNING pacientes.user_id
  )
  SELECT 
    pf.user_id,
    au.email::text,
    'criado'::text as status
  FROM pacientes_faltantes pf
  INNER JOIN auth.users au ON au.id = pf.user_id;
END;
$function$;