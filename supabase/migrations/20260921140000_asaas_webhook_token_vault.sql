-- Token de autenticação do webhook do Asaas, guardado no Vault.
--
-- Contexto: o Asaas exige `authToken` de 32 a 255 caracteres ao registrar um
-- webhook. O valor atual de ASAAS_WEBHOOK_ACCESS_TOKEN é mais curto que isso,
-- então o registro via API seria recusado — e secrets de Edge Function não podem
-- ser gravados pelo código, só pelo painel.
--
-- Guardar o token no Vault resolve os dois lados: a função de configuração gera
-- um token forte e o registra no Asaas, e o receptor do webhook passa a validar
-- contra ele. Fica rotacionável por código, sem depender de ninguém mexer em
-- variável de ambiente.
--
-- A variável de ambiente continua sendo aceita pelo receptor, e tem precedência,
-- para não invalidar a configuração que já existe hoje no painel do Asaas.

CREATE OR REPLACE FUNCTION public.asaas_guardar_webhook_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nome      text := 'asaas_webhook_token';
  v_secret_id uuid;
BEGIN
  IF p_token IS NULL OR length(btrim(p_token)) < 32 THEN
    RAISE EXCEPTION 'O token do webhook precisa ter ao menos 32 caracteres (exigência do Asaas).';
  END IF;

  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_nome;

  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(p_token, v_nome, 'authToken do webhook do Asaas (conta-mãe)');
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_token);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.asaas_ler_webhook_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets WHERE name = 'asaas_webhook_token';
  RETURN v_token;
END;
$function$;

-- Ambas manipulam credencial: só o backend (service_role) pode chamá-las.
REVOKE EXECUTE ON FUNCTION public.asaas_guardar_webhook_token(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.asaas_ler_webhook_token()         FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.asaas_ler_webhook_token() IS
  'Devolve o authToken do webhook do Asaas. Uso exclusivo das Edge Functions; revogada de anon e authenticated.';
