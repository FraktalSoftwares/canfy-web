-- Fix 1: Restrict associacoes_marcas SELECT to admin roles only
DROP POLICY IF EXISTS "Authenticated users can view associacoes_marcas" ON public.associacoes_marcas;

CREATE POLICY "Only admins can view associacoes_marcas"
ON public.associacoes_marcas
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Add role validation to all admin_ RPC functions

-- admin_get_associacao
CREATE OR REPLACE FUNCTION public.admin_get_associacao(p_id uuid)
RETURNS TABLE(id uuid, nome text, tipo text, cnpj text, email text, telefone text, regiao text, cidade text, estado text, endereco text, status text, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Role validation
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.nome,
    a.tipo::text,
    a.cnpj,
    a.email,
    a.telefone,
    a.regiao,
    a.cidade,
    a.estado,
    a.endereco,
    a.status::text,
    a.observacoes,
    a.created_at,
    a.updated_at
  FROM associacoes_marcas a
  WHERE a.id = p_id;
END;
$function$;

-- admin_list_associacoes
CREATE OR REPLACE FUNCTION public.admin_list_associacoes()
RETURNS TABLE(id uuid, nome text, tipo text, cnpj text, email text, telefone text, regiao text, cidade text, estado text, endereco text, status text, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone)
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
    a.id,
    a.nome,
    a.tipo::text,
    a.cnpj,
    a.email,
    a.telefone,
    a.regiao,
    a.cidade,
    a.estado,
    a.endereco,
    a.status::text,
    a.observacoes,
    a.created_at,
    a.updated_at
  FROM associacoes_marcas a
  ORDER BY a.created_at DESC;
END;
$function$;

-- admin_create_associacao
CREATE OR REPLACE FUNCTION public.admin_create_associacao(p_nome text, p_tipo text, p_cnpj text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_telefone text DEFAULT NULL::text, p_regiao text DEFAULT NULL::text, p_cidade text DEFAULT NULL::text, p_estado text DEFAULT NULL::text, p_endereco text DEFAULT NULL::text, p_observacoes text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO associacoes_marcas (nome, tipo, cnpj, email, telefone, regiao, cidade, estado, endereco, observacoes, status)
  VALUES (p_nome, p_tipo::tipo_fornecedor, p_cnpj, p_email, p_telefone, p_regiao, p_cidade, p_estado, p_endereco, p_observacoes, 'ativo')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- admin_update_associacao
CREATE OR REPLACE FUNCTION public.admin_update_associacao(p_id uuid, p_nome text, p_cnpj text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_telefone text DEFAULT NULL::text, p_regiao text DEFAULT NULL::text, p_observacoes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE associacoes_marcas
  SET 
    nome = p_nome,
    cnpj = p_cnpj,
    email = p_email,
    telefone = p_telefone,
    regiao = p_regiao,
    observacoes = p_observacoes,
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- admin_inativar_associacao
CREATE OR REPLACE FUNCTION public.admin_inativar_associacao(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE associacoes_marcas
  SET status = 'inativo'::status_generico, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- admin_list_medicos
CREATE OR REPLACE FUNCTION public.admin_list_medicos()
RETURNS TABLE(id uuid, nome text, email text, telefone text, crm text, uf_crm text, especialidade_nome text, status text, total_atendimentos integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone)
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
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') as especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.ultimo_acesso,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  ORDER BY m.created_at DESC;
END;
$function$;

-- admin_get_medico
CREATE OR REPLACE FUNCTION public.admin_get_medico(p_id uuid)
RETURNS TABLE(id uuid, nome text, email text, telefone text, crm text, uf_crm text, especialidade_nome text, status text, total_atendimentos integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone, user_id uuid)
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
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') as especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.ultimo_acesso,
    m.created_at,
    m.user_id
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  WHERE m.id = p_id;
END;
$function$;

-- admin_update_medico
CREATE OR REPLACE FUNCTION public.admin_update_medico(p_id uuid, p_email text, p_telefone text, p_crm text, p_uf_crm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE medicos
  SET 
    email = p_email,
    telefone = p_telefone,
    crm = p_crm,
    uf_crm = p_uf_crm,
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- admin_inativar_medico
CREATE OR REPLACE FUNCTION public.admin_inativar_medico(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE medicos
  SET status = 'inativo'::status_medico, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- admin_list_pacientes
CREATE OR REPLACE FUNCTION public.admin_list_pacientes()
RETURNS TABLE(id uuid, user_id uuid, nome_completo text, email text, telefone text, cpf text, data_nascimento date, endereco_completo text, total_consultas integer, total_pedidos integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone, ativo boolean)
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
  ORDER BY p.created_at DESC;
END;
$function$;

-- admin_get_paciente
CREATE OR REPLACE FUNCTION public.admin_get_paciente(p_id uuid)
RETURNS TABLE(id uuid, user_id uuid, nome_completo text, email text, telefone text, cpf text, data_nascimento date, endereco_completo text, total_consultas integer, total_pedidos integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone, ativo boolean, foto_perfil_url text)
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
  WHERE p.id = p_id;
END;
$function$;

-- admin_update_paciente
CREATE OR REPLACE FUNCTION public.admin_update_paciente(p_id uuid, p_telefone text DEFAULT NULL::text, p_cpf text DEFAULT NULL::text, p_data_nascimento date DEFAULT NULL::date, p_endereco_completo text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT user_id INTO v_user_id FROM pacientes WHERE id = p_id;
  
  UPDATE pacientes
  SET 
    cpf = COALESCE(p_cpf, cpf),
    data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
    endereco_completo = COALESCE(p_endereco_completo, endereco_completo),
    updated_at = NOW()
  WHERE id = p_id;
  
  UPDATE profiles
  SET
    telefone = COALESCE(p_telefone, telefone),
    updated_at = NOW()
  WHERE id = v_user_id;
END;
$function$;

-- admin_inativar_paciente
CREATE OR REPLACE FUNCTION public.admin_inativar_paciente(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT user_id INTO v_user_id FROM pacientes WHERE id = p_id;
  
  UPDATE profiles
  SET ativo = false, updated_at = NOW()
  WHERE id = v_user_id;
END;
$function$;

-- admin_list_receitas
CREATE OR REPLACE FUNCTION public.admin_list_receitas()
RETURNS TABLE(id uuid, numero_receita text, data_emissao timestamp with time zone, validade date, status text, paciente_user_id uuid, paciente_nome text, medico_nome text, pedidos jsonb)
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
    r.id,
    r.numero_receita,
    r.data_emissao,
    r.validade,
    r.status::text,
    pac.user_id,
    pr.nome_completo,
    m.nome,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'numero_pedido', p.numero_pedido,
          'data_pedido', p.data_pedido,
          'valor_total', p.valor_total,
          'canal_aquisicao', p.canal_aquisicao::text
        )
      )
      FROM pedidos p
      WHERE p.receita_id = r.id
    ) as pedidos
  FROM receitas r
  INNER JOIN pacientes pac ON pac.id = r.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  INNER JOIN medicos m ON m.id = r.medico_id
  ORDER BY r.data_emissao DESC;
END;
$function$;

-- admin_get_dashboard_stats
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS TABLE(total_pacientes_ativos bigint, total_consultas bigint, total_pedidos_ativos bigint, total_pedidos_concluidos bigint, total_medicos_ativos bigint, total_pedidos_cancelados bigint)
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
    
    (SELECT COALESCE(SUM(total_consultas), 0) FROM pacientes) as total_consultas,
    
    (SELECT COUNT(*) FROM pedidos WHERE status IN ('pendente', 'aprovado', 'em_analise', 'em_separacao')) as total_pedidos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'entregue') as total_pedidos_concluidos,
    
    (SELECT COUNT(*) FROM medicos WHERE status = 'ativo') as total_medicos_ativos,
    
    (SELECT COUNT(*) FROM pedidos WHERE status = 'cancelado') as total_pedidos_cancelados;
END;
$function$;

-- admin_get_monthly_receitas
CREATE OR REPLACE FUNCTION public.admin_get_monthly_receitas(p_year integer)
RETURNS TABLE(month integer, month_name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
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
  ORDER BY m.month_num;
END;
$function$;

-- admin_get_monthly_pedidos
CREATE OR REPLACE FUNCTION public.admin_get_monthly_pedidos(p_year integer)
RETURNS TABLE(month integer, month_name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
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
  ORDER BY m.month_num;
END;
$function$;

-- admin_get_recent_pedidos
CREATE OR REPLACE FUNCTION public.admin_get_recent_pedidos(p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, numero_pedido text, paciente_nome text, status text, data_pedido timestamp with time zone)
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
    p.numero_pedido,
    pr.nome_completo as paciente_nome,
    p.status::text,
    p.data_pedido
  FROM pedidos p
  INNER JOIN pacientes pac ON pac.id = p.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  ORDER BY p.data_pedido DESC
  LIMIT p_limit;
END;
$function$;

-- admin_get_recent_medicos
CREATE OR REPLACE FUNCTION public.admin_get_recent_medicos(p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, nome text, email text, crm text, uf_crm text, status text, created_at timestamp with time zone)
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
  LIMIT p_limit;
END;
$function$;