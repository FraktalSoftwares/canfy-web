-- Corrigir search_path nas funções para segurança

-- Atualizar função gerar_numero_receita
CREATE OR REPLACE FUNCTION public.gerar_numero_receita()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  sequencia TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequencia := LPAD((SELECT COUNT(*) + 1 FROM public.receitas WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 6, '0');
  RETURN 'RX-' || ano || '-' || sequencia;
END;
$$;

-- Atualizar função gerar_numero_pedido
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  sequencia TEXT;
BEGIN
  ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  sequencia := LPAD((SELECT COUNT(*) + 1 FROM public.pedidos WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 6, '0');
  RETURN 'PD-' || ano || '-' || sequencia;
END;
$$;