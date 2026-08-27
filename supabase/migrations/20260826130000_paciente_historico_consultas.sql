-- Histórico de consultas do paciente: RPC de listagem paginada/filtrada com detalhe completo
-- + admin_get_paciente passa a contar consultas/receitas/pedidos de verdade (colunas materializadas
-- pacientes.total_* não têm trigger de atualização e podem divergir da contagem real).

-- 1. Índice composto para a listagem por paciente ordenada por data
CREATE INDEX IF NOT EXISTS idx_consultas_paciente_data ON public.consultas(paciente_id, data_consulta DESC);

-- 2. admin_list_paciente_consultas: histórico paginado/filtrado com detalhe completo
CREATE OR REPLACE FUNCTION public.admin_list_paciente_consultas(
  p_paciente_id uuid,
  p_search text DEFAULT NULL,
  p_status text[] DEFAULT NULL,
  p_data_ini timestamp with time zone DEFAULT NULL,
  p_data_fim timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  data_consulta timestamp with time zone,
  status text,
  queixa_principal text,
  sintomas text[],
  eh_retorno boolean,
  medico_id uuid,
  medico_nome text,
  medico_crm text,
  medico_uf_crm text,
  receita_id uuid,
  numero_receita text,
  resumo_atendimento text,
  cancelada_em timestamp with time zone,
  cancelada_por text,
  motivo_cancelamento text,
  reembolsada_em timestamp with time zone,
  avaliacao_medico_nota integer,
  avaliacao_medico_comentario text,
  feedback_nota integer,
  feedback_comentario text,
  total_count bigint
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
  WITH base AS (
    SELECT
      c.id,
      c.data_consulta,
      c.status::text,
      c.queixa_principal,
      c.sintomas,
      c.eh_retorno,
      c.medico_id,
      m.nome AS medico_nome,
      m.crm AS medico_crm,
      m.uf_crm AS medico_uf_crm,
      c.receita_id,
      r.numero_receita,
      c.resumo_atendimento,
      c.cancelada_em,
      c.cancelada_por,
      c.motivo_cancelamento,
      c.reembolsada_em,
      c.avaliacao_medico_nota,
      c.avaliacao_medico_comentario,
      fb.nota AS feedback_nota,
      fb.comentario AS feedback_comentario
    FROM consultas c
    LEFT JOIN medicos m ON m.id = c.medico_id
    LEFT JOIN receitas r ON r.id = c.receita_id
    LEFT JOIN LATERAL (
      SELECT f.nota, f.comentario
      FROM feedbacks_consultas f
      WHERE f.paciente_id = c.paciente_id AND f.data_consulta = c.data_consulta
      LIMIT 1
    ) fb ON true
    WHERE c.paciente_id = p_paciente_id
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (p_search IS NULL OR b.queixa_principal ILIKE '%' || p_search || '%' OR b.medico_nome ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR array_length(p_status, 1) IS NULL OR b.status = ANY(p_status))
      AND (p_data_ini IS NULL OR b.data_consulta >= p_data_ini)
      AND (p_data_fim IS NULL OR b.data_consulta < p_data_fim)
  )
  SELECT f.*, COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.data_consulta DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_paciente_consultas(uuid, text, text[], timestamp with time zone, timestamp with time zone, integer, integer) TO anon, authenticated;

-- 3. admin_get_paciente: total_consultas/total_receitas/total_pedidos passam a ser COUNT(*) real
DROP FUNCTION IF EXISTS public.admin_get_paciente(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_paciente(p_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  rg text,
  data_nascimento date,
  endereco_completo text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  sexo text,
  genero text,
  total_consultas integer,
  total_receitas integer,
  total_pedidos integer,
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone,
  ativo boolean,
  foto_perfil_url text,
  observacoes_admin text
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
    au.email::text,
    pr.telefone,
    p.cpf,
    p.rg,
    p.data_nascimento,
    p.endereco_completo,
    p.endereco_logradouro,
    p.endereco_numero,
    p.endereco_complemento,
    p.bairro,
    p.cidade,
    p.estado,
    p.cep,
    p.sexo,
    p.genero,
    (SELECT COUNT(*) FROM consultas c WHERE c.paciente_id = p.id)::integer AS total_consultas,
    (SELECT COUNT(*) FROM receitas r WHERE r.paciente_id = p.id)::integer AS total_receitas,
    (SELECT COUNT(*) FROM pedidos pd WHERE pd.paciente_id = p.id)::integer AS total_pedidos,
    p.ultimo_acesso,
    p.created_at,
    pr.ativo,
    pr.foto_perfil_url,
    p.observacoes_admin
  FROM pacientes p
  INNER JOIN profiles pr ON pr.id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente(uuid) TO anon, authenticated;
