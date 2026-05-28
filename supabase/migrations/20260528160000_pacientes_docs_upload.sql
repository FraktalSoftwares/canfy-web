-- Aditivo 18.1 (Figma 2727:15100): permitir admin gerenciar documentos do paciente
-- (Documento de identificação + Comprovante de residência) via upload na UI.

-- ============================================
-- 1. Storage: admins podem fazer upload/delete em paciente_docs/*
-- ============================================
DROP POLICY IF EXISTS "Admins podem subir paciente_docs" ON storage.objects;
CREATE POLICY "Admins podem subir paciente_docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'paciente_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins podem deletar paciente_docs" ON storage.objects;
CREATE POLICY "Admins podem deletar paciente_docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'paciente_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins podem atualizar paciente_docs" ON storage.objects;
CREATE POLICY "Admins podem atualizar paciente_docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'paciente_docs'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- ============================================
-- 2. admin_upsert_paciente_documento
--    Substitui doc existente do mesmo tipo categoria='usuario'.
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_upsert_paciente_documento(
  p_paciente_id uuid,
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

  -- 1 doc por tipo por paciente (apenas docs de usuario, não os de pedido)
  DELETE FROM documentos
  WHERE paciente_id = p_paciente_id
    AND tipo::text = p_tipo
    AND pedido_id IS NULL;

  INSERT INTO documentos (paciente_id, tipo, nome_arquivo, arquivo_url, enviado_por, created_at)
  VALUES (p_paciente_id, p_tipo::tipo_documento, p_nome_arquivo, p_arquivo_url, auth.uid(), NOW())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_paciente_documento(uuid, text, text, text) TO anon, authenticated;

-- ============================================
-- 3. admin_delete_paciente_documento
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_delete_paciente_documento(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM documentos WHERE id = p_id AND paciente_id IS NOT NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_delete_paciente_documento(uuid) TO anon, authenticated;
