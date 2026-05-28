-- Aditivo 19.1 (Figma 2706:14410): permitir admin gerenciar medico_documentos
-- + RPCs upsert/delete + storage policies para admins no bucket documents.

-- ============================================
-- 1. RLS: admins podem gerenciar medico_documentos
-- ============================================
ALTER TABLE public.medico_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam medico_documentos" ON public.medico_documentos;
CREATE POLICY "Admins gerenciam medico_documentos"
ON public.medico_documentos
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 2. Storage: admins podem fazer upload/delete em medico_docs/*
-- ============================================
DROP POLICY IF EXISTS "Admins podem subir medico_docs" ON storage.objects;
CREATE POLICY "Admins podem subir medico_docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'medico_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins podem deletar medico_docs" ON storage.objects;
CREATE POLICY "Admins podem deletar medico_docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'medico_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins podem atualizar medico_docs" ON storage.objects;
CREATE POLICY "Admins podem atualizar medico_docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'medico_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- ============================================
-- 3. admin_upsert_medico_documento
--    Substitui doc existente do mesmo tipo (1 por tipo por médico).
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_upsert_medico_documento(
  p_medico_id uuid,
  p_tipo text,
  p_nome_arquivo text,
  p_arquivo_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM medico_documentos
  WHERE medico_id = p_medico_id AND tipo = p_tipo;

  INSERT INTO medico_documentos (medico_id, tipo, nome_arquivo, arquivo_url, created_at)
  VALUES (p_medico_id, p_tipo, p_nome_arquivo, p_arquivo_url, NOW())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_medico_documento(uuid, text, text, text) TO anon, authenticated;

-- ============================================
-- 4. admin_delete_medico_documento
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_delete_medico_documento(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM medico_documentos WHERE id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_delete_medico_documento(uuid) TO anon, authenticated;
