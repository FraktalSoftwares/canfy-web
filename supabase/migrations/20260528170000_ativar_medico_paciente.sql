-- Aditivo: RPCs admin_ativar_medico + admin_ativar_paciente
-- (toggle reverso de admin_inativar_*)

-- ============================================
-- admin_ativar_medico: marca status='ativo'
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_ativar_medico(p_id uuid)
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
  SET status = 'ativo'::status_medico, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_ativar_medico(uuid) TO anon, authenticated;

-- ============================================
-- admin_ativar_paciente: marca profiles.ativo=true
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_ativar_paciente(p_id uuid)
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
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET ativo = true, updated_at = NOW() WHERE id = v_user_id;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_ativar_paciente(uuid) TO anon, authenticated;
