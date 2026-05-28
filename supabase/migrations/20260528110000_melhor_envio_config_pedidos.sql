-- F4: Melhor Envio — config_sistema + pedidos + RPCs

ALTER TABLE public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS melhor_envio_cep_origem TEXT NOT NULL DEFAULT '65901110',
  ADD COLUMN IF NOT EXISTS melhor_envio_sandbox BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS melhor_envio_remetente JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.configuracoes_sistema.melhor_envio_cep_origem IS 'CEP origem para cotação Melhor Envio. Default: Emerson (trocar em prod).';
COMMENT ON COLUMN public.configuracoes_sistema.melhor_envio_sandbox IS 'Quando true, usa sandbox.melhorenvio.com.br. Token em Supabase Secret MELHOR_ENVIO_TOKEN.';
COMMENT ON COLUMN public.configuracoes_sistema.melhor_envio_remetente IS 'Dados remetente exigidos API ME: {nome, document, email, phone, company_document?}';

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS melhor_envio_servico_id INTEGER,
  ADD COLUMN IF NOT EXISTS melhor_envio_order_id TEXT,
  ADD COLUMN IF NOT EXISTS melhor_envio_etiqueta_url TEXT,
  ADD COLUMN IF NOT EXISTS frete_valor NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prazo_entrega_dias INTEGER;

COMMENT ON COLUMN public.pedidos.melhor_envio_servico_id IS 'ID do serviço ME escolhido (1=PAC, 2=SEDEX, etc).';
COMMENT ON COLUMN public.pedidos.melhor_envio_order_id IS 'order_id retornado por /cart + /checkout do ME.';
COMMENT ON COLUMN public.pedidos.melhor_envio_etiqueta_url IS 'URL PDF da etiqueta gerada por /generate.';
COMMENT ON COLUMN public.pedidos.frete_valor IS 'Valor frete escolhido (R$). 100% pago pelo paciente.';
COMMENT ON COLUMN public.pedidos.prazo_entrega_dias IS 'Prazo em dias úteis retornado pela cotação ME.';

CREATE OR REPLACE FUNCTION public.get_melhor_envio_config(p_associacao_id uuid DEFAULT NULL)
RETURNS TABLE(
  cep_origem TEXT,
  sandbox BOOLEAN,
  remetente JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.melhor_envio_cep_origem,
    cs.melhor_envio_sandbox,
    cs.melhor_envio_remetente
  FROM public.configuracoes_sistema cs
  WHERE cs.id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_melhor_envio_config(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_get_configuracoes_sistema();

CREATE OR REPLACE FUNCTION public.admin_get_configuracoes_sistema()
RETURNS TABLE(
  percentual_comissao_medico NUMERIC,
  valor_consulta_padrao NUMERIC,
  taxa_pedido NUMERIC,
  frete_internacional NUMERIC,
  prazo_entrega_internacional_dias INTEGER,
  feriados DATE[],
  melhor_envio_cep_origem TEXT,
  melhor_envio_sandbox BOOLEAN,
  melhor_envio_remetente JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    cs.percentual_comissao_medico,
    cs.valor_consulta_padrao,
    cs.taxa_pedido,
    cs.frete_internacional,
    cs.prazo_entrega_internacional_dias,
    cs.feriados,
    cs.melhor_envio_cep_origem,
    cs.melhor_envio_sandbox,
    cs.melhor_envio_remetente,
    cs.updated_at
  FROM public.configuracoes_sistema cs
  WHERE cs.id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_configuracoes_sistema() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_update_configuracoes_sistema(numeric, numeric, numeric, numeric, integer, date[]);

CREATE OR REPLACE FUNCTION public.admin_update_configuracoes_sistema(
  p_percentual_comissao NUMERIC,
  p_valor_consulta NUMERIC,
  p_taxa_pedido NUMERIC,
  p_frete_intl NUMERIC,
  p_prazo_intl INTEGER,
  p_feriados DATE[],
  p_me_cep_origem TEXT DEFAULT NULL,
  p_me_sandbox BOOLEAN DEFAULT NULL,
  p_me_remetente JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.configuracoes_sistema SET
    percentual_comissao_medico = p_percentual_comissao,
    valor_consulta_padrao = p_valor_consulta,
    taxa_pedido = p_taxa_pedido,
    frete_internacional = p_frete_intl,
    prazo_entrega_internacional_dias = p_prazo_intl,
    feriados = p_feriados,
    melhor_envio_cep_origem = COALESCE(p_me_cep_origem, melhor_envio_cep_origem),
    melhor_envio_sandbox    = COALESCE(p_me_sandbox,    melhor_envio_sandbox),
    melhor_envio_remetente  = COALESCE(p_me_remetente,  melhor_envio_remetente),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_configuracoes_sistema(numeric, numeric, numeric, numeric, integer, date[], text, boolean, jsonb) TO authenticated;
