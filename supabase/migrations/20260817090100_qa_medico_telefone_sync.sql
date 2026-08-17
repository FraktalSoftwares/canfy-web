-- QA: telefone do médico editado no app não aparece no painel web.
-- Causa: o app sempre grava profiles.telefone, mas o update em medicos
-- (que carrega crm/cpf junto) pode falhar silenciosamente ou ser pulado
-- (colisão de UNIQUE(crm), _medicoId nulo, guard isNotEmpty). As RPCs de
-- leitura faziam COALESCE(m.telefone, prof.telefone) — o valor velho de
-- medicos sempre ganhava, e o backfill anterior só preenchia NULLs.

-- Backfill corretivo: profiles.telefone é a origem editável pelo médico.
UPDATE public.medicos m
SET telefone = p.telefone
FROM public.profiles p
WHERE p.id = m.user_id
  AND p.telefone IS NOT NULL
  AND p.telefone IS DISTINCT FROM m.telefone;

-- Mantém medicos.telefone em sincronia com profiles.telefone.
CREATE OR REPLACE FUNCTION public.sync_medico_telefone_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.medicos
  SET telefone = NEW.telefone
  WHERE user_id = NEW.id
    AND telefone IS DISTINCT FROM NEW.telefone;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_medico_telefone ON public.profiles;
CREATE TRIGGER trg_sync_medico_telefone
AFTER UPDATE OF telefone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_medico_telefone_from_profile();

-- Inverte a prioridade nas RPCs de leitura: profiles.telefone prevalece
-- caso o trigger acima falhe por algum motivo.
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
    COALESCE(prof.telefone, m.telefone),
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
    COALESCE(prof.telefone, m.telefone),
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
    COALESCE(prof.telefone, m.telefone),
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
