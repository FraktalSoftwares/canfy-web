-- Corrigir ambiguidades de colunas nas funções do dashboard

-- 1. Corrigir admin_get_dashboard_stats (ambiguidade em total_consultas)
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS TABLE(
  total_pacientes_ativos bigint, 
  total_consultas bigint, 
  total_pedidos_ativos bigint, 
  total_pedidos_concluidos bigint, 
  total_medicos_ativos bigint, 
  total_pedidos_cancelados bigint
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
    (SELECT COUNT(*)::bigint FROM pacientes pac 
     INNER JOIN profiles pr ON pr.id = pac.user_id 
     WHERE pr.ativo = true) as total_pacientes_ativos,
    
    (SELECT COALESCE(SUM(pac.total_consultas), 0)::bigint FROM pacientes pac) as total_consultas,
    
    (SELECT COUNT(*)::bigint FROM pedidos ped WHERE ped.status IN ('pendente', 'aprovado', 'em_analise', 'em_separacao')) as total_pedidos_ativos,
    
    (SELECT COUNT(*)::bigint FROM pedidos ped WHERE ped.status = 'entregue') as total_pedidos_concluidos,
    
    (SELECT COUNT(*)::bigint FROM medicos med WHERE med.status = 'ativo') as total_medicos_ativos,
    
    (SELECT COUNT(*)::bigint FROM pedidos ped WHERE ped.status = 'cancelado') as total_pedidos_cancelados;
END;
$function$;

-- 2. Corrigir admin_get_recent_pedidos (ambiguidade em id)
CREATE OR REPLACE FUNCTION public.admin_get_recent_pedidos(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid, 
  numero_pedido text, 
  paciente_nome text, 
  status text, 
  data_pedido timestamp with time zone
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
    ped.id,
    ped.numero_pedido,
    pr.nome_completo as paciente_nome,
    ped.status::text,
    ped.data_pedido
  FROM pedidos ped
  INNER JOIN pacientes pac ON pac.id = ped.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  ORDER BY ped.data_pedido DESC
  LIMIT p_limit;
END;
$function$;

-- 3. Corrigir admin_get_recent_medicos (ambiguidade em id)
CREATE OR REPLACE FUNCTION public.admin_get_recent_medicos(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid, 
  nome text, 
  email text, 
  crm text, 
  uf_crm text, 
  status text, 
  created_at timestamp with time zone
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
    med.id,
    med.nome,
    med.email,
    med.crm,
    med.uf_crm,
    med.status::text,
    med.created_at
  FROM medicos med
  WHERE med.status = 'pendente_aprovacao'
  ORDER BY med.created_at DESC
  LIMIT p_limit;
END;
$function$;