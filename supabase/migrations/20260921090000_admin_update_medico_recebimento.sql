-- Permite ao administrativo preencher os dados de recebimento do médico.
--
-- Sem isto, a criação da carteira Asaas dependeria de cada médico abrir o app e
-- completar a etapa 4 da validação profissional. Hoje nenhum dos 26 médicos tem
-- endereço estruturado ou renda mensal cadastrados, então o onboarding ficaria
-- parado esperando ação de terceiros.
--
-- Estes campos NÃO são os protegidos por trg_medicos_proteger_campos_financeiros:
-- carteira e percentuais continuam fora do alcance do próprio médico. Aqui são só
-- os dados cadastrais que o POST /v3/accounts exige.

CREATE OR REPLACE FUNCTION public.admin_update_medico_recebimento(
  p_medico_id    uuid,
  p_cep          text,
  p_logradouro   text,
  p_numero       text,
  p_bairro       text,
  p_complemento  text DEFAULT NULL,
  p_renda_mensal numeric DEFAULT NULL,
  p_cnpj         text DEFAULT NULL,
  p_company_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cep  text := regexp_replace(COALESCE(p_cep, ''), '\D', '', 'g');
  v_cnpj text := regexp_replace(COALESCE(p_cnpj, ''), '\D', '', 'g');
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar dados de recebimento.';
  END IF;

  -- Validação explícita em vez de deixar o Asaas recusar com mensagem genérica
  -- na hora de criar a carteira.
  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'CEP inválido: informe os 8 dígitos.';
  END IF;
  IF COALESCE(btrim(p_logradouro), '') = '' THEN
    RAISE EXCEPTION 'Informe o logradouro.';
  END IF;
  IF COALESCE(btrim(p_numero), '') = '' THEN
    RAISE EXCEPTION 'Informe o número do endereço.';
  END IF;
  IF COALESCE(btrim(p_bairro), '') = '' THEN
    RAISE EXCEPTION 'Informe o bairro.';
  END IF;
  IF p_renda_mensal IS NULL OR p_renda_mensal <= 0 THEN
    RAISE EXCEPTION 'Informe a renda ou faturamento mensal (exigido pelo Asaas).';
  END IF;
  IF p_company_type IS NOT NULL AND length(v_cnpj) <> 14 THEN
    RAISE EXCEPTION 'Para pessoa jurídica é obrigatório informar um CNPJ com 14 dígitos.';
  END IF;

  UPDATE medicos
     SET cep                  = v_cep,
         endereco_logradouro  = btrim(p_logradouro),
         endereco_numero      = btrim(p_numero),
         endereco_bairro      = btrim(p_bairro),
         endereco_complemento = NULLIF(btrim(COALESCE(p_complemento, '')), ''),
         renda_mensal         = p_renda_mensal,
         cnpj                 = NULLIF(v_cnpj, ''),
         company_type         = p_company_type,
         updated_at           = now()
   WHERE id = p_medico_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Médico não encontrado.';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_medico_recebimento(uuid, text, text, text, text, text, numeric, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_update_medico_recebimento(uuid, text, text, text, text, text, numeric, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_medico passa a devolver os dados de recebimento, para a tela poder
-- exibir o que já está preenchido e o que falta. Muda de assinatura → DROP.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_medico(uuid);

CREATE FUNCTION public.admin_get_medico(p_id uuid)
RETURNS TABLE(
  id                          uuid,
  nome                        text,
  email                       text,
  telefone                    text,
  cpf                         text,
  crm                         text,
  uf_crm                      text,
  especialidade_nome          text,
  status                      text,
  total_atendimentos          integer,
  total_receitas              integer,
  total_ausencias             integer,
  ultimo_acesso               timestamptz,
  created_at                  timestamptz,
  user_id                     uuid,
  foto_perfil_url             text,
  endereco_profissional       text,
  tempo_atuacao_anos          integer,
  observacoes_admin           text,
  asaas_wallet_id             text,
  asaas_account_id            text,
  asaas_onboarding_status     text,
  asaas_onboarding_url        text,
  percentual_repasse_consulta numeric,
  percentual_comissao_pedido  numeric,
  data_nascimento             date,
  cep                         text,
  endereco_logradouro         text,
  endereco_numero             text,
  endereco_complemento        text,
  endereco_bairro             text,
  renda_mensal                numeric,
  cnpj                        text,
  company_type                text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nome,
    m.email,
    COALESCE(prof.telefone, m.telefone),
    m.cpf,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') AS especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.total_receitas,
    m.total_ausencias,
    m.ultimo_acesso,
    m.created_at,
    m.user_id,
    prof.foto_perfil_url,
    m.endereco_profissional,
    m.tempo_atuacao_anos,
    m.observacoes_admin,
    m.asaas_wallet_id,
    m.asaas_account_id,
    m.asaas_onboarding_status,
    m.asaas_onboarding_url,
    m.percentual_repasse_consulta,
    m.percentual_comissao_pedido,
    m.data_nascimento,
    m.cep,
    m.endereco_logradouro,
    m.endereco_numero,
    m.endereco_complemento,
    m.endereco_bairro,
    m.renda_mensal,
    m.cnpj,
    m.company_type
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.id = p_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_get_medico(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_medico(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Visão operacional: quem está pronto para ter carteira e o que falta em cada um.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_medicos_prontidao_carteira()
RETURNS TABLE(
  medico_id        uuid,
  nome             text,
  status           text,
  carteira_status  text,
  wallet_id        text,
  faltando         text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nome,
    m.status::text,
    m.asaas_onboarding_status,
    m.asaas_wallet_id,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(btrim(m.cpf), '') = '' AND COALESCE(btrim(m.cnpj), '') = '' THEN 'CPF ou CNPJ' END,
      CASE WHEN COALESCE(btrim(m.telefone), '') = '' THEN 'telefone' END,
      CASE WHEN COALESCE(btrim(m.cep), '') = '' THEN 'CEP' END,
      CASE WHEN m.endereco_logradouro IS NULL THEN 'logradouro' END,
      CASE WHEN m.endereco_numero IS NULL THEN 'número' END,
      CASE WHEN m.endereco_bairro IS NULL THEN 'bairro' END,
      CASE WHEN m.renda_mensal IS NULL OR m.renda_mensal <= 0 THEN 'renda mensal' END
    ], NULL)
  FROM medicos m
  ORDER BY m.status, m.nome;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_medicos_prontidao_carteira() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_medicos_prontidao_carteira() TO authenticated;
