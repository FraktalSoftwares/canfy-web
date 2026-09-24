-- Guarda a apiKey da subconta Asaas do médico, cifrada no Vault.
--
-- Contexto: a aprovação da subconta é a condição para o repasse sair, e
-- descobrimos ao testar que NÃO existe forma de consultá-la com a chave da
-- conta-mãe — `GET /v3/accounts/{id}` devolve só dados cadastrais
-- (object, id, name, email, walletId, accountNumber, commercialInfoExpiration),
-- sem nenhum campo de status. Os dois únicos caminhos são:
--
--   1. o webhook ACCOUNT_STATUS_* (push), e
--   2. `GET /v3/myAccount/status` autenticado com a apiKey DA SUBCONTA (pull).
--
-- Antes só existia (1) — e nem ele, porque o webhook não era registrado na
-- criação. Sem um caminho de recuperação, um evento perdido travaria o médico
-- para sempre, sem ninguém perceber. Por isso a apiKey passa a ser guardada.
--
-- Ela NÃO vai numa coluna de `medicos`: fica no Vault, cifrada em repouso, e a
-- tabela guarda apenas o nome do segredo. A função de leitura é a superfície
-- sensível do sistema — revogada de todos, acessível só ao backend.

-- ---------------------------------------------------------------------------
-- 1. Referência ao segredo (nunca a chave em si).
-- ---------------------------------------------------------------------------
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS asaas_apikey_secret_id uuid;

COMMENT ON COLUMN public.medicos.asaas_apikey_secret_id IS
  'Id do segredo no Vault com a apiKey da subconta Asaas. A chave nunca fica em coluna nem em log.';

-- ---------------------------------------------------------------------------
-- 2. Gravação. Idempotente: recriar a carteira sobrescreve o segredo em vez de
--    acumular lixo no Vault.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.asaas_guardar_apikey_subconta(
  p_medico_id uuid,
  p_api_key   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nome      text := 'asaas_subconta_' || p_medico_id::text;
  v_secret_id uuid;
BEGIN
  IF p_api_key IS NULL OR btrim(p_api_key) = '' THEN
    RAISE EXCEPTION 'apiKey da subconta vazia: nada a guardar.';
  END IF;

  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_nome;

  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(
      p_api_key,
      v_nome,
      'apiKey da subconta Asaas do médico ' || p_medico_id::text
    );
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_api_key);
  END IF;

  UPDATE medicos SET asaas_apikey_secret_id = v_secret_id WHERE id = p_medico_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Médico % não encontrado ao guardar a apiKey.', p_medico_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Leitura. Esta função devolve uma credencial em texto claro — é o ponto
--    mais sensível do schema. Só o backend (service_role) pode chamá-la.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.asaas_ler_apikey_subconta(p_medico_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text := 'asaas_subconta_' || p_medico_id::text;
  v_key  text;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = v_nome;
  RETURN v_key;  -- NULL quando não há chave guardada; quem chama decide o que fazer
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Grants. Nenhuma das duas é chamável por usuário logado: a de gravação
--    escreve credencial, a de leitura a devolve.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.asaas_guardar_apikey_subconta(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.asaas_ler_apikey_subconta(uuid)           FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.asaas_ler_apikey_subconta(uuid) IS
  'Devolve a apiKey da subconta em texto claro. Uso exclusivo das Edge Functions (service_role); revogada de anon e authenticated.';
