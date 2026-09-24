-- CORREÇÃO DE FALHA DE SEGURANÇA.
--
-- trg_medicos_proteger_campos_financeiros (migração 20260918100600) foi criada
-- como SECURITY DEFINER e liberava o caminho quando current_user estava em
-- ('service_role','postgres','supabase_admin'). Só que dentro de uma função
-- SECURITY DEFINER o current_user é o DONO da função (postgres) — nunca o
-- chamador. A condição casava sempre e a trava retornava NEW antes de comparar
-- coisa alguma. Ou seja: a proteção nunca protegeu nada.
--
-- Efeito comprovado em teste com um médico autenticado de verdade: ele alterou,
-- na própria linha, percentual_comissao_pedido = 100, percentual_repasse_consulta
-- = 99, asaas_wallet_id arbitrário e asaas_onboarding_status = 'aprovado'.
-- Em produção isso significa desviar 100% das comissões para a própria carteira.
--
-- A função não precisa de SECURITY DEFINER: só lê NEW/OLD e chama has_role, que
-- já é DEFINER por conta própria. Como SECURITY INVOKER, current_user passa a
-- refletir o papel real de quem grava — 'authenticated' via PostgREST,
-- 'service_role' nas Edge Functions, 'postgres' dentro das funções internas.

CREATE OR REPLACE FUNCTION public.trg_medicos_proteger_campos_financeiros()
RETURNS trigger
LANGUAGE plpgsql
-- SEM SECURITY DEFINER de propósito: é o que faz current_user refletir quem de
-- fato está gravando. Reintroduzir DEFINER aqui reabre a falha.
SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend confiável: Edge Functions (service_role) e funções SECURITY DEFINER
  -- do próprio schema (executam como postgres), que já validaram permissão.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.asaas_wallet_id            IS DISTINCT FROM OLD.asaas_wallet_id
     OR NEW.asaas_account_id        IS DISTINCT FROM OLD.asaas_account_id
     OR NEW.asaas_onboarding_status IS DISTINCT FROM OLD.asaas_onboarding_status
     OR NEW.asaas_onboarding_url    IS DISTINCT FROM OLD.asaas_onboarding_url
     OR NEW.asaas_conta_criada_em   IS DISTINCT FROM OLD.asaas_conta_criada_em
     OR NEW.asaas_apikey_secret_id  IS DISTINCT FROM OLD.asaas_apikey_secret_id
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

-- Como SECURITY INVOKER, quem dispara o UPDATE precisa poder executar a função.
GRANT EXECUTE ON FUNCTION public.trg_medicos_proteger_campos_financeiros()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.trg_medicos_proteger_campos_financeiros() IS
  'Impede o médico de alterar a própria carteira Asaas ou os próprios percentuais. SECURITY INVOKER de propósito: com DEFINER, current_user vira o dono da função e a trava nunca avalia.';

-- Desfaz o que o teste de invasão gravou.
UPDATE public.medicos
   SET percentual_comissao_pedido  = NULL,
       percentual_repasse_consulta = NULL,
       asaas_wallet_id             = NULL,
       asaas_account_id            = NULL,
       asaas_onboarding_status     = 'nao_iniciado'
 WHERE id = '2f26e988-6181-48bc-b438-08db24e250a2';
