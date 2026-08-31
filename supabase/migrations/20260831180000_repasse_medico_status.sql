-- Permite que um admin com permissão de edição do módulo 'usuarios' altere o
-- status de um repasse (pendente | efetuado | cancelado) na página de detalhe
-- do médico. Segue o padrão de admin_update_medico_observacoes: has_permission
-- em vez de has_role bruto (ver 20260819213504_qa_has_permission.sql).

CREATE OR REPLACE FUNCTION public.admin_update_repasse_status(
  p_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
  END IF;

  IF p_status NOT IN ('pendente', 'efetuado', 'cancelado') THEN
    RAISE EXCEPTION 'Status de repasse inválido: %', p_status;
  END IF;

  UPDATE repasses_medicos
  SET status = p_status
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repasse não encontrado.';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_repasse_status(uuid, text) TO anon, authenticated;
