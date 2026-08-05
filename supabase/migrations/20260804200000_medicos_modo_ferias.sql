-- Cria coluna dedicada para "Modo férias" do médico, separada do consentimento
-- LGPD de compartilhamento de dados (autoriza_compartilhamento_dados), que era
-- reaproveitado incorretamente pelo app mobile para os dois propósitos.
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS modo_ferias boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.medicos.modo_ferias IS 'Indica se o médico está em modo férias (pausa temporária de atendimentos). Não confundir com autoriza_compartilhamento_dados (consentimento LGPD).';
