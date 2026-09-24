-- Protege os campos financeiros de medicos contra alteração pelo próprio médico.
--
-- A política RLS "Medicos can update own row" permite ao médico atualizar a
-- própria linha — o que era inofensivo enquanto a tabela só tinha dados
-- cadastrais. Com as colunas de repasse isso vira um buraco grave: o médico
-- poderia elevar o próprio percentual de comissão para 100% ou apontar o
-- walletId para outra conta e desviar os repasses.
--
-- RLS não resolve, porque a política é por linha, não por coluna. Um REVOKE de
-- UPDATE por coluna também não serve: derrubaria os fluxos administrativos que
-- atualizam medicos diretamente pelo painel. A trava certa é uma trigger que
-- compara valor antigo e novo e recusa a alteração para quem não for admin.

CREATE OR REPLACE FUNCTION public.trg_medicos_proteger_campos_financeiros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend confiável: Edge Functions (service_role) e funções SECURITY DEFINER,
  -- que já validaram a permissão antes de chegar aqui.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.asaas_wallet_id           IS DISTINCT FROM OLD.asaas_wallet_id
     OR NEW.asaas_account_id       IS DISTINCT FROM OLD.asaas_account_id
     OR NEW.asaas_onboarding_status IS DISTINCT FROM OLD.asaas_onboarding_status
     OR NEW.asaas_onboarding_url   IS DISTINCT FROM OLD.asaas_onboarding_url
     OR NEW.asaas_conta_criada_em  IS DISTINCT FROM OLD.asaas_conta_criada_em
     OR NEW.percentual_repasse_consulta IS DISTINCT FROM OLD.percentual_repasse_consulta
     OR NEW.percentual_comissao_pedido  IS DISTINCT FROM OLD.percentual_comissao_pedido
  THEN
    RAISE EXCEPTION
      'Os dados de recebimento e os percentuais de repasse não podem ser alterados diretamente. Use a criação de carteira no aplicativo ou fale com o administrativo.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS medicos_proteger_campos_financeiros ON public.medicos;
CREATE TRIGGER medicos_proteger_campos_financeiros
BEFORE UPDATE ON public.medicos
FOR EACH ROW
EXECUTE FUNCTION public.trg_medicos_proteger_campos_financeiros();

REVOKE EXECUTE ON FUNCTION public.trg_medicos_proteger_campos_financeiros()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_medicos_proteger_campos_financeiros() IS
  'Impede que o médico altere a própria carteira Asaas ou os próprios percentuais de repasse: só admin ou backend (service_role/SECURITY DEFINER) podem.';
