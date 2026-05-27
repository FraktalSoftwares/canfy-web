-- Dashboard refresh: adiciona status_anvisa em pedidos e refaz stats/listas conforme design Figma

-- 1. status_anvisa em pedidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'status_anvisa'
  ) THEN
    ALTER TABLE public.pedidos
      ADD COLUMN status_anvisa TEXT
        CHECK (status_anvisa IN ('nao_solicitado', 'em_analise', 'aprovado', 'recusado'))
        DEFAULT 'nao_solicitado' NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_status_anvisa
  ON public.pedidos(status_anvisa)
  WHERE status_anvisa <> 'nao_solicitado';

-- 2. admin_get_dashboard_stats: novos campos conforme Figma 23 Dashboard
DROP FUNCTION IF EXISTS public.admin_get_dashboard_stats();

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL
)
RETURNS TABLE(
  receitas_emitidas bigint,
  pedidos_realizados bigint,
  aprovacoes_anvisa bigint,
  produtos_catalogo bigint,
  medicos_ativos bigint,
  pacientes_ativos bigint,
  associacoes_ativas bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);
  v_month integer := p_month;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::bigint FROM receitas r
      WHERE EXTRACT(YEAR FROM r.data_emissao) = v_year
        AND (v_month IS NULL OR EXTRACT(MONTH FROM r.data_emissao) = v_month)
    ) AS receitas_emitidas,

    (SELECT COUNT(*)::bigint FROM pedidos p
      WHERE EXTRACT(YEAR FROM p.data_pedido) = v_year
        AND (v_month IS NULL OR EXTRACT(MONTH FROM p.data_pedido) = v_month)
    ) AS pedidos_realizados,

    (SELECT COUNT(*)::bigint FROM pedidos p
      WHERE p.status_anvisa = 'aprovado'
        AND EXTRACT(YEAR FROM p.data_pedido) = v_year
        AND (v_month IS NULL OR EXTRACT(MONTH FROM p.data_pedido) = v_month)
    ) AS aprovacoes_anvisa,

    (SELECT COUNT(*)::bigint FROM produtos pr WHERE pr.status = 'ativo') AS produtos_catalogo,

    (SELECT COUNT(*)::bigint FROM medicos m WHERE m.status = 'ativo') AS medicos_ativos,

    (SELECT COUNT(*)::bigint FROM pacientes pac
      INNER JOIN profiles prof ON prof.id = pac.user_id
      WHERE prof.ativo = true
    ) AS pacientes_ativos,

    (SELECT COUNT(*)::bigint FROM associacoes_marcas a WHERE a.status = 'ativo') AS associacoes_ativas;
END;
$function$;

-- 3. admin_get_recent_anvisa: lista pedidos com solicitação Anvisa
CREATE OR REPLACE FUNCTION public.admin_get_recent_anvisa(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  numero_pedido text,
  paciente_nome text,
  status_anvisa text,
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
    p.id,
    p.numero_pedido,
    pr.nome_completo AS paciente_nome,
    p.status_anvisa,
    p.data_pedido
  FROM pedidos p
  INNER JOIN pacientes pac ON pac.id = p.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  WHERE p.status_anvisa <> 'nao_solicitado'
  ORDER BY p.data_pedido DESC
  LIMIT p_limit;
END;
$function$;

-- 4. admin_list_receitas: incluir status do pedido no jsonb agregado
CREATE OR REPLACE FUNCTION public.admin_list_receitas()
RETURNS TABLE(
  id uuid,
  numero_receita text,
  data_emissao timestamp with time zone,
  validade date,
  status text,
  paciente_user_id uuid,
  paciente_nome text,
  medico_nome text,
  pedidos jsonb
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
          'id',              p.id,
          'numero_pedido',   p.numero_pedido,
          'data_pedido',     p.data_pedido,
          'valor_total',     p.valor_total,
          'canal_aquisicao', p.canal_aquisicao::text,
          'status',          p.status::text,
          'status_anvisa',   p.status_anvisa
        )
        ORDER BY p.data_pedido DESC
      )
      FROM pedidos p
      WHERE p.receita_id = r.id
    ) AS pedidos
  FROM receitas r
  INNER JOIN pacientes pac ON pac.id = r.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  INNER JOIN medicos m ON m.id = r.medico_id
  ORDER BY r.data_emissao DESC;
END;
$function$;

-- 5. Pedidos: campos para rastreio e prazo entrega (usados em 20.1 Detalhes pedido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'codigo_rastreio'
  ) THEN
    ALTER TABLE public.pedidos
      ADD COLUMN codigo_rastreio TEXT,
      ADD COLUMN rastreio_atualizado_em TIMESTAMP WITH TIME ZONE,
      ADD COLUMN prazo_entrega_inicio DATE,
      ADD COLUMN prazo_entrega_fim DATE;
  END IF;
END $$;

-- 6. admin_get_pedido_detalhes: agrega pedido + receita + paciente + médico + documentos + histórico
CREATE OR REPLACE FUNCTION public.admin_get_pedido_detalhes(p_id uuid)
RETURNS TABLE(
  id uuid,
  numero_pedido text,
  status text,
  status_anvisa text,
  valor_total numeric,
  canal_aquisicao text,
  data_pedido timestamp with time zone,
  codigo_rastreio text,
  rastreio_atualizado_em timestamp with time zone,
  prazo_entrega_inicio date,
  prazo_entrega_fim date,
  receita_id uuid,
  numero_receita text,
  data_emissao timestamp with time zone,
  paciente_id uuid,
  paciente_nome text,
  medico_nome text,
  documentos jsonb,
  historico jsonb
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
    p.numero_pedido,
    p.status::text,
    p.status_anvisa,
    p.valor_total,
    p.canal_aquisicao::text,
    p.data_pedido,
    p.codigo_rastreio,
    p.rastreio_atualizado_em,
    p.prazo_entrega_inicio,
    p.prazo_entrega_fim,
    r.id,
    r.numero_receita,
    r.data_emissao,
    pac.id,
    pr.nome_completo,
    m.nome,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id',           d.id,
        'tipo',         d.tipo::text,
        'nome_arquivo', d.nome_arquivo,
        'arquivo_url',  d.arquivo_url
      ) ORDER BY d.created_at DESC)
      FROM documentos d
      WHERE d.paciente_id = pac.id
    ) AS documentos,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'status_anterior', ph.status_anterior,
        'status_novo',     ph.status_novo,
        'observacao',      ph.observacao,
        'created_at',      ph.created_at
      ) ORDER BY ph.created_at ASC)
      FROM pedido_historico ph
      WHERE ph.pedido_id = p.id
    ) AS historico
  FROM pedidos p
  LEFT JOIN receitas r ON r.id = p.receita_id
  INNER JOIN pacientes pac ON pac.id = p.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  LEFT JOIN medicos m ON m.id = r.medico_id
  WHERE p.id = p_id;
END;
$function$;

-- 7. admin_update_pedido_anvisa: admin define status Anvisa manualmente (W7)
CREATE OR REPLACE FUNCTION public.admin_update_pedido_anvisa(
  p_id uuid,
  p_status_anvisa text,
  p_observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status text;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_status_anvisa NOT IN ('nao_solicitado', 'em_analise', 'aprovado', 'recusado') THEN
    RAISE EXCEPTION 'status_anvisa inválido: %', p_status_anvisa;
  END IF;

  SELECT status_anvisa INTO v_old_status FROM pedidos WHERE id = p_id;

  UPDATE pedidos
  SET status_anvisa = p_status_anvisa, updated_at = NOW()
  WHERE id = p_id;

  INSERT INTO pedido_historico (pedido_id, status_anterior, status_novo, responsavel_id, observacao)
  VALUES (p_id, 'anvisa:' || v_old_status, 'anvisa:' || p_status_anvisa, auth.uid(), p_observacao);
END;
$function$;

-- 8. Pacientes: campos extras para detalhes (Figma 18.1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'genero'
  ) THEN
    ALTER TABLE public.pacientes
      ADD COLUMN genero TEXT,
      ADD COLUMN observacoes_admin TEXT,
      ADD COLUMN total_receitas INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 9. admin_get_paciente: expor genero + observacoes_admin + total_receitas
DROP FUNCTION IF EXISTS public.admin_get_paciente(uuid);

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
    (SELECT email FROM auth.users WHERE id = p.user_id) AS email,
    pr.telefone,
    p.cpf,
    p.data_nascimento,
    p.endereco_completo,
    p.genero,
    p.total_consultas,
    p.total_receitas,
    p.total_pedidos,
    p.ultimo_acesso,
    p.created_at,
    pr.ativo,
    pr.foto_perfil_url,
    p.observacoes_admin
  FROM pacientes p
  INNER JOIN profiles pr ON pr.id = p.user_id
  WHERE p.id = p_id;
END;
$function$;

-- 10. admin_update_paciente_observacoes: salvar observações admin
CREATE OR REPLACE FUNCTION public.admin_update_paciente_observacoes(
  p_id uuid,
  p_observacoes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE pacientes
  SET observacoes_admin = p_observacoes, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- 11. admin_get_paciente_pagamentos: histórico unificado de consultas + pedidos
CREATE OR REPLACE FUNCTION public.admin_get_paciente_pagamentos(p_paciente_id uuid)
RETURNS TABLE(
  data_pagamento timestamp with time zone,
  tipo text,
  valor numeric,
  referencia text
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
    p.data_pedido AS data_pagamento,
    'Pedido'::text AS tipo,
    COALESCE(p.valor_total, 0) AS valor,
    p.numero_pedido AS referencia
  FROM pedidos p
  WHERE p.paciente_id = p_paciente_id
    AND p.status IN ('aprovado', 'em_separacao', 'enviado', 'entregue')
  ORDER BY p.data_pedido DESC;
END;
$function$;

-- 12. admin_get_paciente_documentos: documentos de identificação + por produto
CREATE OR REPLACE FUNCTION public.admin_get_paciente_documentos(p_paciente_id uuid)
RETURNS TABLE(
  id uuid,
  tipo text,
  nome_arquivo text,
  arquivo_url text,
  categoria text,
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
    d.id,
    d.tipo::text,
    d.nome_arquivo,
    d.arquivo_url,
    CASE
      WHEN d.tipo IN ('identidade', 'comprovante_residencia') THEN 'usuario'
      ELSE 'produto'
    END AS categoria,
    d.created_at
  FROM documentos d
  WHERE d.paciente_id = p_paciente_id
  ORDER BY d.created_at DESC;
END;
$function$;

-- 13. Médicos: campos validação para solicitações (W9)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'medicos' AND column_name = 'status_validacao'
  ) THEN
    ALTER TABLE public.medicos
      ADD COLUMN status_validacao TEXT
        CHECK (status_validacao IN ('em_analise', 'incompleto', 'aprovado', 'recusado'))
        DEFAULT 'em_analise',
      ADD COLUMN etapa_validacao INTEGER DEFAULT 1
        CHECK (etapa_validacao BETWEEN 1 AND 3),
      ADD COLUMN motivo_recusa TEXT;
  END IF;
END $$;

-- 14. admin_list_medicos_solicitacoes: pendentes de aprovação para tab "Solicitações"
CREATE OR REPLACE FUNCTION public.admin_list_medicos_solicitacoes()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  telefone text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  total_atendimentos integer,
  ultimo_acesso timestamp with time zone,
  foto_perfil_url text,
  status_validacao text,
  etapa_validacao integer,
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
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.total_atendimentos,
    m.ultimo_acesso,
    prof.foto_perfil_url,
    m.status_validacao,
    m.etapa_validacao,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.status = 'pendente_aprovacao'
  ORDER BY m.created_at DESC;
END;
$function$;

-- 15. admin_aprovar_medico: ativa médico após validação OK
CREATE OR REPLACE FUNCTION public.admin_aprovar_medico(p_id uuid)
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
    status = 'ativo',
    status_validacao = 'aprovado',
    etapa_validacao = 3,
    motivo_recusa = NULL,
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- 16. admin_recusar_medico: rejeita solicitação com motivo
CREATE OR REPLACE FUNCTION public.admin_recusar_medico(p_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'motivo obrigatório';
  END IF;

  UPDATE medicos
  SET
    status_validacao = 'recusado',
    motivo_recusa = p_motivo,
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- 17. Médicos: campos extras para detalhes (19.1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'medicos' AND column_name = 'endereco_profissional'
  ) THEN
    ALTER TABLE public.medicos
      ADD COLUMN endereco_profissional TEXT,
      ADD COLUMN tempo_atuacao_anos INTEGER,
      ADD COLUMN observacoes_admin TEXT,
      ADD COLUMN total_receitas INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 18. Tabela repasses_medicos: histórico de repasses 5% (F5)
CREATE TABLE IF NOT EXISTS public.repasses_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  data_repasse DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'efetuado', 'cancelado')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repasses_medicos_medico ON public.repasses_medicos(medico_id, data_repasse DESC);

ALTER TABLE public.repasses_medicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view repasses_medicos" ON public.repasses_medicos;
CREATE POLICY "Only admins can view repasses_medicos"
ON public.repasses_medicos
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- 19. admin_get_medico estendido com novos campos
DROP FUNCTION IF EXISTS public.admin_get_medico(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_medico(p_id uuid)
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  telefone text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  status text,
  total_atendimentos integer,
  total_receitas integer,
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone,
  user_id uuid,
  foto_perfil_url text,
  endereco_profissional text,
  tempo_atuacao_anos integer,
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
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_receitas,
    m.ultimo_acesso,
    m.created_at,
    m.user_id,
    prof.foto_perfil_url,
    m.endereco_profissional,
    m.tempo_atuacao_anos,
    m.observacoes_admin
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.id = p_id;
END;
$function$;

-- 20. admin_update_medico_observacoes
CREATE OR REPLACE FUNCTION public.admin_update_medico_observacoes(
  p_id uuid,
  p_observacoes text
)
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
  SET observacoes_admin = p_observacoes, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

-- 21. admin_get_medico_documentos
CREATE OR REPLACE FUNCTION public.admin_get_medico_documentos(p_medico_id uuid)
RETURNS TABLE(
  id uuid,
  tipo text,
  nome_arquivo text,
  arquivo_url text,
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
    d.id,
    d.tipo::text,
    d.nome_arquivo,
    d.arquivo_url,
    d.created_at
  FROM documentos d
  WHERE d.medico_id = p_medico_id
  ORDER BY d.created_at DESC;
END;
$function$;

-- 22. admin_get_medico_repasses
CREATE OR REPLACE FUNCTION public.admin_get_medico_repasses(p_medico_id uuid)
RETURNS TABLE(
  id uuid,
  data_repasse date,
  valor numeric,
  status text,
  observacao text
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
  SELECT r.id, r.data_repasse, r.valor, r.status, r.observacao
  FROM repasses_medicos r
  WHERE r.medico_id = p_medico_id
  ORDER BY r.data_repasse DESC;
END;
$function$;

-- 23. admin_get_recent_medicos: incluir foto_perfil_url do profile
DROP FUNCTION IF EXISTS public.admin_get_recent_medicos(integer);

CREATE OR REPLACE FUNCTION public.admin_get_recent_medicos(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  crm text,
  uf_crm text,
  status text,
  foto_perfil_url text,
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
    m.id,
    m.nome,
    m.email,
    m.crm,
    m.uf_crm,
    m.status::text,
    prof.foto_perfil_url,
    m.created_at
  FROM medicos m
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.status = 'pendente_aprovacao'
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$function$;
