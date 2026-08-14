-- QA: telefone do médico não aparece no painel mesmo preenchido.
-- Causa: o mobile grava o telefone em profiles.telefone, mas as RPCs
-- admin_get_medico / admin_list_medicos / admin_list_medicos_solicitacoes
-- leem medicos.telefone (frequentemente NULL). Backfill + COALESCE nas
-- RPCs, e admin_update_medico passa a manter os dois lados em sincronia.

-- Backfill: preencher medicos.telefone a partir de profiles quando vazio.
UPDATE public.medicos m
SET telefone = p.telefone
FROM public.profiles p
WHERE p.id = m.user_id
  AND m.telefone IS NULL
  AND p.telefone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_list_medicos()
 RETURNS TABLE(id uuid, nome text, email text, telefone text, cpf text, crm text, uf_crm text, especialidade_nome text, status text, total_atendimentos integer, total_ausencias integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone)
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
    COALESCE(m.telefone, prof.telefone),
    m.cpf,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_ausencias,
    COALESCE((SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = m.user_id), m.ultimo_acesso) AS ultimo_acesso,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  ORDER BY m.created_at DESC;
END;
$function$;

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
    COALESCE(m.telefone, prof.telefone),
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
    COALESCE(m.telefone, prof.telefone),
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
DECLARE
  v_user_id uuid;
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
  WHERE id = p_id
  RETURNING user_id INTO v_user_id;

  IF p_telefone IS NOT NULL AND v_user_id IS NOT NULL THEN
    UPDATE profiles SET telefone = p_telefone WHERE id = v_user_id;
  END IF;
END;
$function$;
