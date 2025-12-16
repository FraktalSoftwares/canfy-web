-- Create function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS TABLE(
  total_pacientes_ativos bigint,
  total_consultas bigint,
  total_pedidos_ativos bigint,
  total_pedidos_concluidos bigint,
  total_medicos_ativos bigint,
  total_pedidos_cancelados bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM pacientes p 
     INNER JOIN profiles pr ON pr.id = p.user_id 
     WHERE pr.ativo = true) as total_pacientes_ativos,
    
    (SELECT COALESCE(SUM(total_consultas), 0) FROM pacientes) as total_consultas,
    
    (SELECT COUNT(*) FROM pedidos WHERE status IN ('pendente', 'aprovado', 'em_analise', 'em_separacao')) as total_pedidos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'entregue') as total_pedidos_concluidos,
    
    (SELECT COUNT(*) FROM medicos WHERE status = 'ativo') as total_medicos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'cancelado') as total_pedidos_cancelados
$$;

-- Create function to get monthly receitas count
CREATE OR REPLACE FUNCTION public.admin_get_monthly_receitas(p_year integer)
RETURNS TABLE(
  month integer,
  month_name text,
  count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH months AS (
    SELECT 
      generate_series(1, 12) as month_num,
      to_char(make_date(p_year, generate_series(1, 12), 1), 'Mon') as month_name
  )
  SELECT 
    m.month_num,
    m.month_name,
    COALESCE(COUNT(r.id), 0)::bigint as count
  FROM months m
  LEFT JOIN receitas r ON 
    EXTRACT(MONTH FROM r.data_emissao) = m.month_num AND
    EXTRACT(YEAR FROM r.data_emissao) = p_year
  GROUP BY m.month_num, m.month_name
  ORDER BY m.month_num
$$;

-- Create function to get monthly pedidos count
CREATE OR REPLACE FUNCTION public.admin_get_monthly_pedidos(p_year integer)
RETURNS TABLE(
  month integer,
  month_name text,
  count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH months AS (
    SELECT 
      generate_series(1, 12) as month_num,
      to_char(make_date(p_year, generate_series(1, 12), 1), 'Mon') as month_name
  )
  SELECT 
    m.month_num,
    m.month_name,
    COALESCE(COUNT(p.id), 0)::bigint as count
  FROM months m
  LEFT JOIN pedidos p ON 
    EXTRACT(MONTH FROM p.data_pedido) = m.month_num AND
    EXTRACT(YEAR FROM p.data_pedido) = p_year
  GROUP BY m.month_num, m.month_name
  ORDER BY m.month_num
$$;

-- Create function to get recent pedidos
CREATE OR REPLACE FUNCTION public.admin_get_recent_pedidos(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  numero_pedido text,
  paciente_nome text,
  status text,
  data_pedido timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.numero_pedido,
    pr.nome_completo as paciente_nome,
    p.status::text,
    p.data_pedido
  FROM pedidos p
  INNER JOIN pacientes pac ON pac.id = p.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  ORDER BY p.data_pedido DESC
  LIMIT p_limit
$$;

-- Create function to get recent medicos (pending approval)
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    id,
    nome,
    email,
    crm,
    uf_crm,
    status::text,
    created_at
  FROM medicos
  WHERE status = 'pendente_aprovacao'
  ORDER BY created_at DESC
  LIMIT p_limit
$$;