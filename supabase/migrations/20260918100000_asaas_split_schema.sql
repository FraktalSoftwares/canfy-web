-- Split de pagamentos Asaas: schema para repasse automático ao médico.
--
-- Contexto: hoje o dinheiro entra 100% na conta Canfy e repasses_medicos é um
-- livro-caixa manual — um admin marca 'efetuado' à mão e nenhum centavo se move.
-- Esta migração cria a identidade de pagamento do médico (subconta Asaas) e
-- transforma repasses_medicos em espelho do estado real no Asaas.
--
-- Decisões de produto:
--   * Comissão de pedido (5%): split na própria cobrança, creditado no pagamento.
--   * Consulta: transferência (POST /v3/transfers) ao finalizar — no momento da
--     cobrança o médico ainda não existe, porque a consulta entra numa fila e só
--     depois alguém a assume (medico_assumir_consulta).
--   * Percentuais: globais em configuracoes_sistema, com override por médico.
--     Lidos em tempo de execução — nunca hardcoded, nunca exigindo deploy.

-- ---------------------------------------------------------------------------
-- 1. medicos: identidade de recebimento (subconta Asaas) + dados exigidos pelo
--    POST /v3/accounts. Hoje só existem endereco_completo/endereco_profissional
--    em texto livre, que não são parseáveis para os campos que o Asaas exige.
-- ---------------------------------------------------------------------------
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS asaas_account_id            text,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id             text,
  ADD COLUMN IF NOT EXISTS asaas_onboarding_status     text NOT NULL DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS asaas_onboarding_url        text,
  ADD COLUMN IF NOT EXISTS asaas_conta_criada_em       timestamptz,
  ADD COLUMN IF NOT EXISTS cnpj                        text,
  ADD COLUMN IF NOT EXISTS company_type                text,
  ADD COLUMN IF NOT EXISTS cep                         text,
  ADD COLUMN IF NOT EXISTS endereco_logradouro         text,
  ADD COLUMN IF NOT EXISTS endereco_numero             text,
  ADD COLUMN IF NOT EXISTS endereco_complemento        text,
  ADD COLUMN IF NOT EXISTS endereco_bairro             text,
  ADD COLUMN IF NOT EXISTS renda_mensal                numeric(12,2),
  ADD COLUMN IF NOT EXISTS percentual_repasse_consulta numeric(5,2),
  ADD COLUMN IF NOT EXISTS percentual_comissao_pedido  numeric(5,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicos_asaas_onboarding_status_check') THEN
    ALTER TABLE public.medicos ADD CONSTRAINT medicos_asaas_onboarding_status_check
      CHECK (asaas_onboarding_status IN ('nao_iniciado','pendente_documentos','em_analise','aprovado','recusado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicos_company_type_check') THEN
    ALTER TABLE public.medicos ADD CONSTRAINT medicos_company_type_check
      CHECK (company_type IS NULL OR company_type IN ('MEI','LIMITED','INDIVIDUAL','ASSOCIATION'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicos_percentuais_check') THEN
    ALTER TABLE public.medicos ADD CONSTRAINT medicos_percentuais_check
      CHECK (
        (percentual_repasse_consulta IS NULL OR (percentual_repasse_consulta >= 0 AND percentual_repasse_consulta <= 100))
        AND
        (percentual_comissao_pedido IS NULL OR (percentual_comissao_pedido >= 0 AND percentual_comissao_pedido <= 100))
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_medicos_asaas_wallet_unico
  ON public.medicos(asaas_wallet_id)
  WHERE asaas_wallet_id IS NOT NULL;

COMMENT ON COLUMN public.medicos.asaas_wallet_id IS
  'walletId da subconta Asaas do médico. Destino do split (pedidos) e das transferências (consultas).';
COMMENT ON COLUMN public.medicos.asaas_account_id IS
  'id da subconta Asaas. O apiKey da subconta NÃO é armazenado: split e transferência partem sempre da conta-mãe.';
COMMENT ON COLUMN public.medicos.asaas_onboarding_status IS
  'Espelho do status de aprovação da subconta no Asaas. O split não executa enquanto não for aprovado.';
COMMENT ON COLUMN public.medicos.percentual_repasse_consulta IS
  'Override do percentual de repasse de consulta. NULL = usa configuracoes_sistema.percentual_repasse_consulta.';
COMMENT ON COLUMN public.medicos.percentual_comissao_pedido IS
  'Override do percentual de comissão de pedido. NULL = usa configuracoes_sistema.percentual_comissao_medico.';
COMMENT ON COLUMN public.medicos.renda_mensal IS
  'incomeValue exigido pelo POST /v3/accounts do Asaas por obrigação regulatória.';

-- ---------------------------------------------------------------------------
-- 2. consultas.valor: snapshot do preço.
--    Sem isso, o preço da consulta só existe em configuracoes_sistema e é lido
--    na hora de exibir — mudar a configuração reescreveria o histórico inteiro e
--    tornaria o cálculo do repasse de consulta irreprodutível.
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS valor numeric(10,2);

COMMENT ON COLUMN public.consultas.valor IS
  'Valor cobrado do paciente nesta consulta, congelado no agendamento. Base de cálculo do repasse ao médico.';

-- Backfill: preferir o valor realmente cobrado; cair para a configuração atual.
UPDATE public.consultas c
   SET valor = sub.value
  FROM (
    SELECT DISTINCT ON (ap.reference_id) ap.reference_id, ap.value
      FROM public.asaas_payments ap
     WHERE ap.reference_type = 'consultation'
       AND ap.reference_id IS NOT NULL
     ORDER BY ap.reference_id, ap.created_at DESC
  ) sub
 WHERE c.valor IS NULL
   AND sub.reference_id = c.id::text;

UPDATE public.consultas
   SET valor = (SELECT valor_consulta_padrao FROM public.configuracoes_sistema WHERE id = 1)
 WHERE valor IS NULL;

-- ---------------------------------------------------------------------------
-- 3. configuracoes_sistema: percentual de consulta + kill switch do split.
-- ---------------------------------------------------------------------------
ALTER TABLE public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS percentual_repasse_consulta numeric(5,2) NOT NULL DEFAULT 70.00,
  ADD COLUMN IF NOT EXISTS asaas_split_ativo           boolean      NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_percentual_repasse_consulta_check') THEN
    ALTER TABLE public.configuracoes_sistema ADD CONSTRAINT configuracoes_percentual_repasse_consulta_check
      CHECK (percentual_repasse_consulta >= 0 AND percentual_repasse_consulta <= 100);
  END IF;
END $$;

COMMENT ON COLUMN public.configuracoes_sistema.percentual_repasse_consulta IS
  'Percentual do valor da consulta repassado ao médico. Lido em tempo de execução — alterar não exige deploy.';
COMMENT ON COLUMN public.configuracoes_sistema.asaas_split_ativo IS
  'Kill switch do split/transferência automáticos. false = cobranças saem sem split e os repasses ficam pendentes.';

-- ---------------------------------------------------------------------------
-- 4. repasses_medicos: de livro-caixa manual a espelho do estado no Asaas.
--    A coluna status (pendente|efetuado|cancelado) permanece como contrato de
--    compatibilidade — repasseStatus.ts, financial_page.dart e MedicoDetalhes.tsx
--    dependem dela. A granularidade de UI vem da situacao derivada nas RPCs.
-- ---------------------------------------------------------------------------
ALTER TABLE public.repasses_medicos
  ADD COLUMN IF NOT EXISTS consulta_id        uuid REFERENCES public.consultas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem             text NOT NULL DEFAULT 'pedido',
  ADD COLUMN IF NOT EXISTS asaas_payment_id   text,
  ADD COLUMN IF NOT EXISTS asaas_split_id     text,
  ADD COLUMN IF NOT EXISTS asaas_transfer_id  text,
  ADD COLUMN IF NOT EXISTS asaas_status       text,
  ADD COLUMN IF NOT EXISTS refusal_reason     text,
  ADD COLUMN IF NOT EXISTS percentual         numeric(5,2),
  ADD COLUMN IF NOT EXISTS base_calculo       numeric(10,2),
  ADD COLUMN IF NOT EXISTS pago_em            timestamptz,
  ADD COLUMN IF NOT EXISTS erro               text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repasses_medicos_origem_check') THEN
    ALTER TABLE public.repasses_medicos ADD CONSTRAINT repasses_medicos_origem_check
      CHECK (origem IN ('pedido','consulta'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repasses_medicos_consulta_unico
  ON public.repasses_medicos(consulta_id)
  WHERE consulta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repasses_medicos_split_unico
  ON public.repasses_medicos(asaas_split_id)
  WHERE asaas_split_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repasses_medicos_transfer_unico
  ON public.repasses_medicos(asaas_transfer_id)
  WHERE asaas_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repasses_medicos_asaas_payment
  ON public.repasses_medicos(asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

COMMENT ON COLUMN public.repasses_medicos.origem IS
  'pedido = comissão via split na cobrança; consulta = repasse via transferência entre contas Asaas.';
COMMENT ON COLUMN public.repasses_medicos.asaas_status IS
  'Status bruto do Asaas (PENDING/AWAITING_CREDIT/DONE/CANCELLED/REFUSED/REFUNDED, ou status da transferência).';
COMMENT ON COLUMN public.repasses_medicos.percentual IS
  'Percentual aplicado no momento da criação. Congelado: mudar a configuração não reescreve repasse já gerado.';
COMMENT ON COLUMN public.repasses_medicos.base_calculo IS
  'Base sobre a qual o percentual incidiu, congelada junto com o percentual.';
COMMENT ON COLUMN public.repasses_medicos.erro IS
  'Motivo de o repasse não poder sair sozinho (médico sem carteira, split recusado, divergência). Alimenta a situação "pendencia".';

-- ---------------------------------------------------------------------------
-- 5. asaas_webhook_events: idempotência do webhook.
--    O Asaas reentrega eventos. Sem registro do que já foi processado, uma
--    reentrega de PAYMENT_SPLIT_DONE credita o repasse duas vezes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asaas_webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      text NOT NULL UNIQUE,
  event         text NOT NULL,
  payload       jsonb NOT NULL,
  recebido_em   timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  erro          text
);

CREATE INDEX IF NOT EXISTS idx_asaas_webhook_events_erro
  ON public.asaas_webhook_events(recebido_em DESC)
  WHERE erro IS NOT NULL;

COMMENT ON TABLE public.asaas_webhook_events IS
  'Log de eventos recebidos do Asaas. event_id é único e serve de trava de idempotência contra reentregas.';
COMMENT ON COLUMN public.asaas_webhook_events.erro IS
  'O webhook sempre responde 200 (o Asaas pausa a fila em não-2xx); a falha real fica registrada aqui.';

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver eventos do Asaas" ON public.asaas_webhook_events;
CREATE POLICY "Admins podem ver eventos do Asaas"
  ON public.asaas_webhook_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
