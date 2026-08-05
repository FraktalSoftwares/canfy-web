-- Suporte a anexos (arquivo/foto) nas mensagens de chat da consulta.
ALTER TABLE public.chat_mensagens
  ADD COLUMN IF NOT EXISTS anexo_url text,
  ADD COLUMN IF NOT EXISTS anexo_tipo text; -- 'imagem' | 'arquivo'

COMMENT ON COLUMN public.chat_mensagens.anexo_url IS 'URL pública do anexo no Storage (bucket documents, pasta chat_anexos/{user_id}/...), se houver.';
COMMENT ON COLUMN public.chat_mensagens.anexo_tipo IS 'Tipo do anexo: imagem ou arquivo. Null quando a mensagem não tem anexo.';

-- Permite que o remetente faça upload do próprio anexo em documents/chat_anexos/{auth.uid()}/...
CREATE POLICY "Users can upload chat attachments in own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'chat_anexos'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );
