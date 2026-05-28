-- Aditivo 19/M8/W2: completa pendências do módulo Médicos.
-- 1. consultas.cancelada_por + motivo_cancelamento
-- 2. trigger: incrementa medicos.total_ausencias quando consulta cancelada pelo médico
-- 3. trigger: auto-inativa médico ao ultrapassar 15 ausências/ano
-- 4. fix admin_get_medico_documentos para ler de medico_documentos (tipos: rg_ou_cnh, diploma, ...)
-- 5. RPCs admin_get_medico_atendimentos + admin_get_medico_receitas (drill-down detalhes)
-- 6. RPC admin_register_medico_ausencia (admin marca falta manualmente)
-- 7. RPC admin_reset_medico_ausencias (reset anual quando virar o ano)

-- ============================================
-- 1. consultas: cancelada_por + motivo_cancelamento
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consultas' AND column_name='cancelada_por'
  ) THEN
    ALTER TABLE public.consultas
      ADD COLUMN cancelada_por TEXT
        CHECK (cancelada_por IS NULL OR cancelada_por IN ('paciente','medico','sistema','admin')),
      ADD COLUMN motivo_cancelamento TEXT,
      ADD COLUMN cancelada_em TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 2. Trigger: incrementa total_ausencias do médico
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_medico_ausencia_inc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Conta como ausência quando consulta transita para 'cancelada' e foi cancelada pelo médico
  IF NEW.status::text = 'cancelada'
     AND (OLD.status::text IS DISTINCT FROM 'cancelada' OR OLD.cancelada_por IS DISTINCT FROM NEW.cancelada_por)
     AND NEW.cancelada_por = 'medico'
     AND NEW.medico_id IS NOT NULL THEN
    UPDATE public.medicos
    SET total_ausencias = total_ausencias + 1,
        updated_at = NOW()
    WHERE id = NEW.medico_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_medico_ausencia ON public.consultas;
CREATE TRIGGER trg_consulta_medico_ausencia
AFTER UPDATE ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public.trg_medico_ausencia_inc();

-- ============================================
-- 3. Trigger: auto-inativa quando ultrapassar 15 ausências
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_medico_auto_inativa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.total_ausencias > 15
     AND NEW.status::text = 'ativo'
     AND (OLD.total_ausencias IS NULL OR OLD.total_ausencias <= 15) THEN
    NEW.status := 'inativo'::status_medico;
    NEW.observacoes_admin := COALESCE(NEW.observacoes_admin || E'\n\n', '')
      || '[Sistema ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI')
      || '] Conta inativada automaticamente: tolerância de 15 ausências em consultas no ano foi excedida.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medico_auto_inativa ON public.medicos;
CREATE TRIGGER trg_medico_auto_inativa
BEFORE UPDATE OF total_ausencias ON public.medicos
FOR EACH ROW EXECUTE FUNCTION public.trg_medico_auto_inativa();

-- ============================================
-- 4. admin_get_medico_documentos: ler de medico_documentos
-- ============================================
DROP FUNCTION IF EXISTS public.admin_get_medico_documentos(uuid);

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
    md.id,
    md.tipo,
    md.nome_arquivo,
    md.arquivo_url,
    md.created_at
  FROM medico_documentos md
  WHERE md.medico_id = p_medico_id
  ORDER BY
    CASE md.tipo
      WHEN 'rg_ou_cnh' THEN 1
      WHEN 'comprovante_crm_cro' THEN 2
      WHEN 'diploma' THEN 3
      WHEN 'certificado_complementar' THEN 4
      WHEN 'comprovante_residencia' THEN 5
      WHEN 'outros_documentos' THEN 6
      ELSE 99
    END,
    md.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_medico_documentos(uuid) TO anon, authenticated;

-- ============================================
-- 5. admin_get_medico_atendimentos: drill-down de atendimentos
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_medico_atendimentos(
  p_medico_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  data_consulta timestamp with time zone,
  status text,
  queixa_principal text,
  paciente_nome text,
  receita_id uuid,
  cancelada_por text,
  motivo_cancelamento text
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
    c.id,
    c.data_consulta,
    c.status::text,
    c.queixa_principal,
    pr.nome_completo,
    c.receita_id,
    c.cancelada_por,
    c.motivo_cancelamento
  FROM consultas c
  INNER JOIN pacientes pac ON pac.id = c.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  WHERE c.medico_id = p_medico_id
  ORDER BY c.data_consulta DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_medico_atendimentos(uuid, integer) TO anon, authenticated;

-- ============================================
-- 6. admin_get_medico_receitas: drill-down de receitas
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_medico_receitas(
  p_medico_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  numero_receita text,
  data_emissao timestamp with time zone,
  validade timestamp with time zone,
  status text,
  paciente_nome text,
  documento_url text
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
    pr.nome_completo,
    r.documento_url
  FROM receitas r
  INNER JOIN pacientes pac ON pac.id = r.paciente_id
  INNER JOIN profiles pr ON pr.id = pac.user_id
  WHERE r.medico_id = p_medico_id
  ORDER BY r.data_emissao DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_medico_receitas(uuid, integer) TO anon, authenticated;

-- ============================================
-- 7. admin_register_medico_ausencia: admin marca falta manualmente
--    (uso: ajuste manual, conferência, casos não automáticos)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_register_medico_ausencia(
  p_medico_id uuid,
  p_consulta_id uuid DEFAULT NULL,
  p_motivo text DEFAULT NULL
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

  IF p_consulta_id IS NOT NULL THEN
    UPDATE consultas
    SET status = 'cancelada',
        cancelada_por = 'medico',
        motivo_cancelamento = COALESCE(p_motivo, motivo_cancelamento, 'Médico não compareceu'),
        cancelada_em = NOW(),
        updated_at = NOW()
    WHERE id = p_consulta_id AND medico_id = p_medico_id;
    -- Trigger trg_consulta_medico_ausencia incrementa contador automaticamente
  ELSE
    -- Sem consulta vinculada: incremento direto + auto-inativa via trigger
    UPDATE medicos
    SET total_ausencias = total_ausencias + 1,
        updated_at = NOW()
    WHERE id = p_medico_id;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_register_medico_ausencia(uuid, uuid, text) TO anon, authenticated;

-- ============================================
-- 8. admin_reset_medico_ausencias: reset anual
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_reset_medico_ausencias(p_medico_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_medico_id IS NULL THEN
    UPDATE medicos SET total_ausencias = 0, updated_at = NOW() WHERE total_ausencias > 0;
  ELSE
    UPDATE medicos SET total_ausencias = 0, updated_at = NOW() WHERE id = p_medico_id;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_reset_medico_ausencias(uuid) TO anon, authenticated;
