-- Expõe ao painel a carteira Asaas do médico e os overrides de percentual.
--
-- Sem isto o administrativo não consegue nem ver se o médico tem carteira, nem
-- ajustar o percentual dele — e a configuração por médico voltaria a depender de
-- SQL manual, que é exatamente o que se quer evitar.
--
-- admin_get_medico muda de assinatura, então precisa de DROP antes do CREATE.

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
  percentual_comissao_pedido  numeric
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
    m.percentual_comissao_pedido
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  LEFT JOIN profiles prof ON prof.id = m.user_id
  WHERE m.id = p_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_get_medico(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_medico(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ajuste dos percentuais por médico. NULL volta a usar o valor global de
-- configuracoes_sistema — por isso os parâmetros aceitam nulo de propósito e a
-- função não usa COALESCE para "preservar" o valor anterior.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_medico_percentuais(
  p_medico_id             uuid,
  p_percentual_consulta   numeric,
  p_percentual_pedido     numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar percentuais de repasse.';
  END IF;

  IF p_percentual_consulta IS NOT NULL
     AND (p_percentual_consulta < 0 OR p_percentual_consulta > 100) THEN
    RAISE EXCEPTION 'O percentual de consulta deve estar entre 0 e 100.';
  END IF;
  IF p_percentual_pedido IS NOT NULL
     AND (p_percentual_pedido < 0 OR p_percentual_pedido > 100) THEN
    RAISE EXCEPTION 'O percentual de pedido deve estar entre 0 e 100.';
  END IF;

  UPDATE medicos
     SET percentual_repasse_consulta = p_percentual_consulta,
         percentual_comissao_pedido  = p_percentual_pedido,
         updated_at = now()
   WHERE id = p_medico_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Médico não encontrado.';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_medico_percentuais(uuid, numeric, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_update_medico_percentuais(uuid, numeric, numeric) TO authenticated;
