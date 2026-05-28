-- Aditivo módulo 19 (Médicos): adicionar CPF e contador anual de ausências
-- + atualizar admin_list_medicos, admin_list_medicos_solicitacoes, admin_get_medico,
--   admin_update_medico para expor / aceitar esses campos.

-- ============================================
-- 1. Schema: cpf + total_ausencias em medicos
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'medicos' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.medicos
      ADD COLUMN cpf TEXT,
      ADD COLUMN total_ausencias INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 2. admin_list_medicos: + cpf + total_ausencias
-- ============================================
DROP FUNCTION IF EXISTS public.admin_list_medicos();

CREATE OR REPLACE FUNCTION public.admin_list_medicos()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  telefone text,
  cpf text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  status text,
  total_atendimentos integer,
  total_ausencias integer,
  ultimo_acesso timestamp with time zone,
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
    m.cpf,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_ausencias,
    m.ultimo_acesso,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  ORDER BY m.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_medicos() TO anon, authenticated;

-- ============================================
-- 3. admin_list_medicos_solicitacoes: + cpf
-- ============================================
DROP FUNCTION IF EXISTS public.admin_list_medicos_solicitacoes();

CREATE OR REPLACE FUNCTION public.admin_list_medicos_solicitacoes()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  telefone text,
  cpf text,
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
    m.cpf,
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

GRANT EXECUTE ON FUNCTION public.admin_list_medicos_solicitacoes() TO anon, authenticated;

-- ============================================
-- 4. admin_get_medico: + cpf + total_ausencias
-- ============================================
DROP FUNCTION IF EXISTS public.admin_get_medico(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_medico(p_id uuid)
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  telefone text,
  cpf text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  status text,
  total_atendimentos integer,
  total_receitas integer,
  total_ausencias integer,
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
    m.cpf,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_receitas,
    m.total_ausencias,
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

GRANT EXECUTE ON FUNCTION public.admin_get_medico(uuid) TO anon, authenticated;

-- ============================================
-- 5. admin_update_medico: aceitar cpf opcional
-- ============================================
DROP FUNCTION IF EXISTS public.admin_update_medico(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_update_medico(
  p_id uuid,
  p_email text,
  p_telefone text,
  p_crm text,
  p_uf_crm text,
  p_cpf text DEFAULT NULL
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
  SET
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    crm = COALESCE(p_crm, crm),
    uf_crm = COALESCE(p_uf_crm, uf_crm),
    cpf = COALESCE(p_cpf, cpf),
    updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_medico(uuid, text, text, text, text, text) TO anon, authenticated;
