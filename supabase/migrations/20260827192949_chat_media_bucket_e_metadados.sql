-- Chat da consulta: bucket privado para mídia (áudio/foto/arquivo), metadados de
-- anexo em chat_mensagens e correções de RLS.
--
-- Contexto: até aqui os anexos iam para documents/chat_anexos/{uid}/..., num bucket
-- PÚBLICO restrito a pdf/png/jpeg. Isso (a) impedia áudio e (b) deixava anexo clínico
-- legível por qualquer um que tivesse a URL. Passamos a usar o bucket privado
-- 'chat-media' com signed URL. Anexos antigos continuam em documents e seguem
-- funcionando (ver anexo_path abaixo).

-- ---------------------------------------------------------------------------
-- 1. DDL de chat_mensagens (a tabela foi criada fora do versionamento; este bloco
--    apenas registra o estado atual de forma idempotente)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  remetente_tipo text NOT NULL CHECK (remetente_tipo IN ('paciente', 'medico')),
  remetente_id uuid NOT NULL,
  mensagem text NOT NULL,
  lida boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  anexo_url text,
  anexo_tipo text
);

ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Metadados de anexo
-- ---------------------------------------------------------------------------

ALTER TABLE public.chat_mensagens
  ADD COLUMN IF NOT EXISTS anexo_path       text,
  ADD COLUMN IF NOT EXISTS anexo_nome       text,
  ADD COLUMN IF NOT EXISTS anexo_mime       text,
  ADD COLUMN IF NOT EXISTS anexo_tamanho    integer,
  ADD COLUMN IF NOT EXISTS anexo_duracao_ms integer;

COMMENT ON COLUMN public.chat_mensagens.anexo_path IS
  'Caminho do objeto no bucket privado chat-media ({consulta_id}/{user_id}/{ts}_{nome}). Quando preenchido, o cliente resolve o acesso por signed URL e IGNORA anexo_url. Quando null e anexo_url preenchido, trata-se de anexo legado público no bucket documents.';
COMMENT ON COLUMN public.chat_mensagens.anexo_nome IS 'Nome original do arquivo, exibido na bolha da mensagem.';
COMMENT ON COLUMN public.chat_mensagens.anexo_mime IS 'MIME type do anexo (ex: audio/mp4, image/jpeg, application/pdf).';
COMMENT ON COLUMN public.chat_mensagens.anexo_tamanho IS 'Tamanho do anexo em bytes.';
COMMENT ON COLUMN public.chat_mensagens.anexo_duracao_ms IS 'Duração em milissegundos, apenas para anexo_tipo = audio.';

-- anexo_tipo passa a aceitar 'audio' (antes era texto livre, sem CHECK)
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_anexo_tipo_check;
ALTER TABLE public.chat_mensagens
  ADD CONSTRAINT chat_mensagens_anexo_tipo_check
  CHECK (anexo_tipo IS NULL OR anexo_tipo IN ('imagem', 'arquivo', 'audio'));

COMMENT ON COLUMN public.chat_mensagens.anexo_tipo IS 'Tipo do anexo: imagem, arquivo ou audio. Null quando a mensagem não tem anexo.';

-- Mensagem de anexo não precisa mais de placeholder ('Foto', nome do arquivo...)
ALTER TABLE public.chat_mensagens ALTER COLUMN mensagem SET DEFAULT '';

-- ---------------------------------------------------------------------------
-- 3. RLS de chat_mensagens
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON public.chat_mensagens;
CREATE POLICY "Participantes podem ver mensagens"
  ON public.chat_mensagens FOR SELECT
  USING (public.is_consulta_participant(consulta_id));

DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON public.chat_mensagens;
CREATE POLICY "Participantes podem enviar mensagens"
  ON public.chat_mensagens FOR INSERT
  WITH CHECK (
    public.is_consulta_participant(consulta_id)
    AND remetente_id = auth.uid()
  );

-- A policy anterior de UPDATE permitia a qualquer participante editar QUALQUER
-- coluna de QUALQUER mensagem da consulta (inclusive o texto da mensagem do outro).
-- Agora só é possível tocar em mensagem recebida — o uso legítimo é marcar como lida.
DROP POLICY IF EXISTS "Participantes podem marcar como lida" ON public.chat_mensagens;
CREATE POLICY "Participantes podem marcar como lida"
  ON public.chat_mensagens FOR UPDATE
  USING (
    public.is_consulta_participant(consulta_id)
    AND remetente_id <> auth.uid()
  )
  WITH CHECK (
    public.is_consulta_participant(consulta_id)
    AND remetente_id <> auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 4. Bucket privado chat-media
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,
  26214400, -- 25 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'audio/mp4', 'audio/aac', 'audio/m4a', 'audio/mpeg', 'audio/ogg', 'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Layout do path: {consulta_id}/{user_id}/{timestamp}_{nome}
-- Leitura e escrita são gated pela mesma função usada em chat_mensagens.

-- Extrai o consulta_id do path com cast seguro: um path fora do layout esperado
-- devolve NULL (a policy nega) em vez de estourar erro de cast de uuid inválido.
CREATE OR REPLACE FUNCTION public.chat_media_consulta_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  primeiro_segmento text;
BEGIN
  primeiro_segmento := (storage.foldername(object_name))[1];
  RETURN primeiro_segmento::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.chat_media_consulta_id(text) IS
  'Extrai o consulta_id da primeira pasta de um objeto do bucket chat-media. Retorna NULL se o path não seguir o layout {consulta_id}/{user_id}/{arquivo}.';

DROP POLICY IF EXISTS "Participantes podem ver midia do chat" ON storage.objects;
CREATE POLICY "Participantes podem ver midia do chat"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND public.is_consulta_participant(public.chat_media_consulta_id(name))
  );

DROP POLICY IF EXISTS "Participantes podem enviar midia do chat" ON storage.objects;
CREATE POLICY "Participantes podem enviar midia do chat"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND public.is_consulta_participant(public.chat_media_consulta_id(name))
  );

-- Permite desfazer um envio recém-feito (apenas a própria mídia).
DROP POLICY IF EXISTS "Participantes podem apagar a propria midia do chat" ON storage.objects;
CREATE POLICY "Participantes podem apagar a propria midia do chat"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND public.is_consulta_participant(public.chat_media_consulta_id(name))
  );
