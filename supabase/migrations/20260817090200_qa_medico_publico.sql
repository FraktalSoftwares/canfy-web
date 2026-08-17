-- QA: foto de perfil do médico não aparece para o paciente no app.
-- Causa: a foto só existe em profiles.foto_perfil_url, e as políticas de
-- SELECT de profiles não permitem paciente ler a linha de um médico (só
-- o inverso). Em vez de abrir RLS row-level em profiles (o que exporia
-- CPF/telefone do médico), expõe-se apenas os campos públicos via RPC.
CREATE OR REPLACE FUNCTION public.get_medico_publico(p_medico_id uuid)
RETURNS TABLE(
  id uuid,
  nome text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  foto_perfil_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.nome,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    prof.foto_perfil_url
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.id = p_medico_id
    AND m.status = 'ativo';
END;
$function$;
