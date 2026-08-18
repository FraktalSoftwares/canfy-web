-- Schema base para o despacho de consultas por nível de prioridade (discovery:
-- board FigJam 9sSwRN9A4CYPH3JuiQDIPX, nó 1208:4019) e para push notifications.

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS fila_desde timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notificados_nivel jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reembolsada_em timestamptz;

COMMENT ON COLUMN public.consultas.fila_desde IS 'Momento em que a consulta entrou na fila sem médico (medico_id nulo). Base de tempo para o escalonamento por nível.';
COMMENT ON COLUMN public.consultas.notificados_nivel IS 'Array JSON com os níveis de despacho (1-5) e marcadores de controle (ex. "expirada") já processados para esta consulta — evita redisparo.';
COMMENT ON COLUMN public.consultas.reembolsada_em IS 'Preenchido quando a consulta expira sem nenhum médico aceitar e o reembolso automático é disparado.';

-- Tokens de dispositivo para push (FCM/APNs via FCM).
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  plataforma text NOT NULL CHECK (plataforma IN ('android', 'ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens" ON public.push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Permite a notificação levar o usuário direto para a tela relevante ao tocar.
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS rota text,
  ADD COLUMN IF NOT EXISTS rota_params jsonb;

COMMENT ON COLUMN public.notificacoes.rota IS 'Rota do app (go_router) para navegar ao tocar na notificação, ex. /appointment/details. Null = sem navegação.';
COMMENT ON COLUMN public.notificacoes.rota_params IS 'Parâmetros da rota (ex. {"consultaId": "..."}) para montar o caminho completo no cliente.';

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
