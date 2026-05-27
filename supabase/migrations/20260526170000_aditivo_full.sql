-- Aditivo: tabelas/campos para W1 Blog, W2 Feedbacks, W3 Config sistema,
-- W10 nac/intl, W11 docs/produtos obrigatórios, W7/W8 aprovação Anvisa/pedido

-- ============================================
-- 1. CONFIGURAÇÕES DO SISTEMA (W3) — singleton row
-- ============================================
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  percentual_comissao_medico NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  valor_consulta_padrao NUMERIC(10,2) NOT NULL DEFAULT 99.90,
  taxa_pedido NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  frete_internacional NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  prazo_entrega_internacional_dias INTEGER NOT NULL DEFAULT 30,
  feriados DATE[] NOT NULL DEFAULT ARRAY[]::DATE[],
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.configuracoes_sistema (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins read configuracoes_sistema" ON public.configuracoes_sistema;
CREATE POLICY "Only admins read configuracoes_sistema"
ON public.configuracoes_sistema FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_get_configuracoes_sistema()
RETURNS TABLE(
  percentual_comissao_medico numeric,
  valor_consulta_padrao numeric,
  taxa_pedido numeric,
  frete_internacional numeric,
  prazo_entrega_internacional_dias integer,
  feriados date[],
  updated_at timestamp with time zone
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT c.percentual_comissao_medico, c.valor_consulta_padrao, c.taxa_pedido,
         c.frete_internacional, c.prazo_entrega_internacional_dias, c.feriados, c.updated_at
  FROM configuracoes_sistema c WHERE c.id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_configuracoes_sistema(
  p_percentual_comissao numeric,
  p_valor_consulta numeric,
  p_taxa_pedido numeric,
  p_frete_intl numeric,
  p_prazo_intl integer,
  p_feriados date[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE configuracoes_sistema SET
    percentual_comissao_medico = p_percentual_comissao,
    valor_consulta_padrao = p_valor_consulta,
    taxa_pedido = p_taxa_pedido,
    frete_internacional = p_frete_intl,
    prazo_entrega_internacional_dias = p_prazo_intl,
    feriados = COALESCE(p_feriados, ARRAY[]::date[]),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

-- ============================================
-- 2. BLOG (W1)
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  resumo TEXT,
  conteudo TEXT NOT NULL,
  capa_url TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'agendado', 'arquivado')),
  data_publicacao TIMESTAMP WITH TIME ZONE,
  autor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status, data_publicacao DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads publicados" ON public.blog_posts;
CREATE POLICY "Public reads publicados"
ON public.blog_posts FOR SELECT
USING (status = 'publicado' OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_list_blog_posts()
RETURNS TABLE(
  id uuid, titulo text, slug text, resumo text, status text,
  data_publicacao timestamp with time zone, autor_nome text,
  created_at timestamp with time zone, capa_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT b.id, b.titulo, b.slug, b.resumo, b.status, b.data_publicacao,
         pr.nome_completo, b.created_at, b.capa_url
  FROM blog_posts b
  LEFT JOIN profiles pr ON pr.id = b.autor_id
  ORDER BY COALESCE(b.data_publicacao, b.created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_blog_post(
  p_id uuid,
  p_titulo text,
  p_slug text,
  p_resumo text,
  p_conteudo text,
  p_capa_url text,
  p_status text,
  p_data_publicacao timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO blog_posts (titulo, slug, resumo, conteudo, capa_url, status, data_publicacao, autor_id)
    VALUES (p_titulo, p_slug, p_resumo, p_conteudo, p_capa_url, p_status, p_data_publicacao, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE blog_posts SET
      titulo = p_titulo, slug = p_slug, resumo = p_resumo, conteudo = p_conteudo,
      capa_url = p_capa_url, status = p_status, data_publicacao = p_data_publicacao,
      updated_at = NOW()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_blog_post(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM blog_posts WHERE id = p_id;
END;
$$;

-- ============================================
-- 3. FEEDBACKS CONSULTAS (W2)
-- ============================================
CREATE TABLE IF NOT EXISTS public.feedbacks_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  data_consulta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_nota ON public.feedbacks_consultas(nota, created_at DESC);

ALTER TABLE public.feedbacks_consultas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins read feedbacks" ON public.feedbacks_consultas;
CREATE POLICY "Only admins read feedbacks"
ON public.feedbacks_consultas FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_list_feedbacks(p_nota_min integer DEFAULT NULL)
RETURNS TABLE(
  id uuid, nota integer, comentario text,
  paciente_nome text, medico_nome text,
  data_consulta timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT f.id, f.nota, f.comentario, prof.nome_completo, m.nome,
         f.data_consulta, f.created_at
  FROM feedbacks_consultas f
  INNER JOIN pacientes pac ON pac.id = f.paciente_id
  INNER JOIN profiles prof ON prof.id = pac.user_id
  LEFT JOIN medicos m ON m.id = f.medico_id
  WHERE (p_nota_min IS NULL OR f.nota >= p_nota_min)
  ORDER BY f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_feedbacks_resumo()
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
  FROM feedbacks_consultas;
END;
$$;

-- ============================================
-- 4. PRODUTOS: nac/intl + preço dual (W10)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'tipo_origem'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN tipo_origem TEXT NOT NULL DEFAULT 'nacional'
        CHECK (tipo_origem IN ('nacional', 'internacional')),
      ADD COLUMN preco_brl NUMERIC(10,2),
      ADD COLUMN preco_usd NUMERIC(10,2);
  END IF;
END $$;

-- ============================================
-- 5. ASSOCIAÇÕES: docs obrigatórios + produtos (W11)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'associacoes_marcas' AND column_name = 'documentos_obrigatorios'
  ) THEN
    ALTER TABLE public.associacoes_marcas
      ADD COLUMN documentos_obrigatorios TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN produtos_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
  END IF;
END $$;

-- ============================================
-- 6. PEDIDOS: aprovação manual admin (W8)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_aprovar_pedido(p_id uuid, p_observacao text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_old text;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT status::text INTO v_old FROM pedidos WHERE id = p_id;
  UPDATE pedidos SET status = 'aprovado', updated_at = NOW() WHERE id = p_id;
  INSERT INTO pedido_historico (pedido_id, status_anterior, status_novo, responsavel_id, observacao)
  VALUES (p_id, v_old, 'aprovado', auth.uid(), p_observacao);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recusar_pedido(p_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_old text;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'motivo obrigatório';
  END IF;
  SELECT status::text INTO v_old FROM pedidos WHERE id = p_id;
  UPDATE pedidos SET status = 'recusado', updated_at = NOW() WHERE id = p_id;
  INSERT INTO pedido_historico (pedido_id, status_anterior, status_novo, responsavel_id, observacao)
  VALUES (p_id, v_old, 'recusado', auth.uid(), p_motivo);
END;
$$;
