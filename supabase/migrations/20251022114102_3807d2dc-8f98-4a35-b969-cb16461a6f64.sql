-- Corrigir a função admin_get_dashboard_stats para evitar ambiguidade de colunas
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
    (SELECT COUNT(*) FROM pacientes p 
     INNER JOIN profiles pr ON pr.id = p.user_id 
     WHERE pr.ativo = true) as total_pacientes_ativos,
    
    (SELECT COALESCE(SUM(p.total_consultas), 0) FROM pacientes p) as total_consultas,
    
    (SELECT COUNT(*) FROM pedidos WHERE status IN ('pendente', 'aprovado', 'em_analise', 'em_separacao')) as total_pedidos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'entregue') as total_pedidos_concluidos,
    
    (SELECT COUNT(*) FROM medicos WHERE status = 'ativo') as total_medicos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'cancelado') as total_pedidos_cancelados;
END;
$function$;