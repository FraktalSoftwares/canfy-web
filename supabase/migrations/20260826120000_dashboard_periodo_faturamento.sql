-- Dashboard: filtro de período customizado (intervalo livre em vez de mês fixo) + faturamento em R$
-- admin_get_dashboard_stats passa a receber p_data_ini/p_data_fim (intervalo [ini, fim)) em vez de p_year/p_month,
-- e ganha faturamento_pedidos/faturamento_consultas/faturamento_total.
-- admin_get_feedbacks_resumo passa a aceitar o mesmo intervalo.
-- Nova admin_get_monthly_faturamento espelha admin_get_monthly_pedidos, somando valores em vez de contar.

-- 1. admin_get_dashboard_stats: p_year/p_month -> p_data_ini/p_data_fim + faturamento
DROP FUNCTION IF EXISTS public.admin_get_dashboard_stats(integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats(
  p_data_ini timestamp with time zone DEFAULT NULL,
  p_data_fim timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  receitas_emitidas bigint,
  pedidos_realizados bigint,
  aprovacoes_anvisa bigint,
  produtos_catalogo bigint,
  medicos_ativos bigint,
  pacientes_ativos bigint,
  associacoes_ativas bigint,
  faturamento_pedidos numeric,
  consultas_finalizadas bigint,
  faturamento_consultas numeric,
  faturamento_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valor_consulta numeric := COALESCE((SELECT valor_consulta_padrao FROM configuracoes_sistema WHERE id = 1), 0);
  v_consultas_finalizadas bigint;
  v_faturamento_pedidos numeric;
  v_faturamento_consultas numeric;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(COUNT(*), 0) INTO v_consultas_finalizadas
  FROM consultas c
  WHERE c.status = 'finalizada'
    AND (p_data_ini IS NULL OR c.data_consulta >= p_data_ini)
    AND (p_data_fim IS NULL OR c.data_consulta < p_data_fim);

  SELECT COALESCE(SUM(p.valor_total), 0) INTO v_faturamento_pedidos
  FROM pedidos p
  WHERE p.status NOT IN ('cancelado', 'recusado')
    AND (p_data_ini IS NULL OR p.data_pedido >= p_data_ini)
    AND (p_data_fim IS NULL OR p.data_pedido < p_data_fim);

  v_faturamento_consultas := v_consultas_finalizadas * v_valor_consulta;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::bigint FROM receitas r
      WHERE (p_data_ini IS NULL OR r.data_emissao >= p_data_ini)
        AND (p_data_fim IS NULL OR r.data_emissao < p_data_fim)
    ) AS receitas_emitidas,

    (SELECT COUNT(*)::bigint FROM pedidos p
      WHERE (p_data_ini IS NULL OR p.data_pedido >= p_data_ini)
        AND (p_data_fim IS NULL OR p.data_pedido < p_data_fim)
    ) AS pedidos_realizados,

    (SELECT COUNT(*)::bigint FROM pedidos p
      WHERE p.status_anvisa = 'aprovado'
        AND (p_data_ini IS NULL OR p.data_pedido >= p_data_ini)
        AND (p_data_fim IS NULL OR p.data_pedido < p_data_fim)
    ) AS aprovacoes_anvisa,

    (SELECT COUNT(*)::bigint FROM produtos pr WHERE pr.status = 'ativo') AS produtos_catalogo,

    (SELECT COUNT(*)::bigint FROM medicos m WHERE m.status = 'ativo') AS medicos_ativos,

    (SELECT COUNT(*)::bigint FROM pacientes pac
      INNER JOIN profiles prof ON prof.id = pac.user_id
      WHERE prof.ativo = true
    ) AS pacientes_ativos,

    (SELECT COUNT(*)::bigint FROM associacoes_marcas a WHERE a.status = 'ativo') AS associacoes_ativas,

    v_faturamento_pedidos AS faturamento_pedidos,
    v_consultas_finalizadas AS consultas_finalizadas,
    v_faturamento_consultas AS faturamento_consultas,
    (v_faturamento_pedidos + v_faturamento_consultas) AS faturamento_total;
END;
$function$;

-- 2. admin_get_feedbacks_resumo: aceita o mesmo intervalo, filtrando por data_consulta
CREATE OR REPLACE FUNCTION public.admin_get_feedbacks_resumo(
  p_data_ini timestamp with time zone DEFAULT NULL,
  p_data_fim timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  total bigint,
  media_geral numeric,
  notas_baixas bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COALESCE(ROUND(AVG(nota)::numeric, 2), 0),
    COUNT(*) FILTER (WHERE nota <= 2)::bigint
  FROM feedbacks_consultas f
  WHERE (p_data_ini IS NULL OR f.data_consulta >= p_data_ini)
    AND (p_data_fim IS NULL OR f.data_consulta < p_data_fim);
END;
$$;

-- 3. admin_get_monthly_faturamento: espelha admin_get_monthly_pedidos, somando valores em vez de contar
CREATE OR REPLACE FUNCTION public.admin_get_monthly_faturamento(p_year integer)
RETURNS TABLE(month integer, month_name text, valor numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valor_consulta numeric := COALESCE((SELECT valor_consulta_padrao FROM configuracoes_sistema WHERE id = 1), 0);
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT
      generate_series(1, 12) as month_num,
      to_char(make_date(p_year, generate_series(1, 12), 1), 'Mon') as month_name
  ),
  pedidos_mes AS (
    SELECT
      EXTRACT(MONTH FROM p.data_pedido)::integer as month_num,
      COALESCE(SUM(p.valor_total), 0) as valor
    FROM pedidos p
    WHERE EXTRACT(YEAR FROM p.data_pedido) = p_year
      AND p.status NOT IN ('cancelado', 'recusado')
    GROUP BY EXTRACT(MONTH FROM p.data_pedido)
  ),
  consultas_mes AS (
    SELECT
      EXTRACT(MONTH FROM c.data_consulta)::integer as month_num,
      COUNT(*) * v_valor_consulta as valor
    FROM consultas c
    WHERE EXTRACT(YEAR FROM c.data_consulta) = p_year
      AND c.status = 'finalizada'
    GROUP BY EXTRACT(MONTH FROM c.data_consulta)
  )
  SELECT
    m.month_num,
    m.month_name,
    (COALESCE(pm.valor, 0) + COALESCE(cm.valor, 0)) as valor
  FROM months m
  LEFT JOIN pedidos_mes pm ON pm.month_num = m.month_num
  LEFT JOIN consultas_mes cm ON cm.month_num = m.month_num
  ORDER BY m.month_num;
END;
$function$;
