-- Adiciona peso e dimensões para cotação Melhor Envio (F4)
-- Defaults = mínimos ME (envelope pequeno: 11x2x16 cm, 100g)

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS peso_g INTEGER NOT NULL DEFAULT 100 CHECK (peso_g > 0 AND peso_g <= 30000),
  ADD COLUMN IF NOT EXISTS largura_cm NUMERIC(6,2) NOT NULL DEFAULT 11 CHECK (largura_cm >= 11 AND largura_cm <= 105),
  ADD COLUMN IF NOT EXISTS altura_cm NUMERIC(6,2) NOT NULL DEFAULT 2 CHECK (altura_cm >= 2 AND altura_cm <= 105),
  ADD COLUMN IF NOT EXISTS comprimento_cm NUMERIC(6,2) NOT NULL DEFAULT 16 CHECK (comprimento_cm >= 16 AND comprimento_cm <= 105);

COMMENT ON COLUMN public.produtos.peso_g IS 'Peso unitário em gramas. Usado na cotação Melhor Envio.';
COMMENT ON COLUMN public.produtos.largura_cm IS 'Largura embalagem em cm. Mínimo ME: 11cm.';
COMMENT ON COLUMN public.produtos.altura_cm IS 'Altura embalagem em cm. Mínimo ME: 2cm.';
COMMENT ON COLUMN public.produtos.comprimento_cm IS 'Comprimento embalagem em cm. Mínimo ME: 16cm.';

-- Recria create_produto com novos parâmetros (assinatura mudou)
DROP FUNCTION IF EXISTS public.create_produto(text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_produto(
  p_nome_comercial text,
  p_principio_ativo text,
  p_forma_farmaceutica text,
  p_concentracao_cbd text,
  p_concentracao_thc text,
  p_fabricante text,
  p_volume_quantidade text,
  p_imagem_url text,
  p_status text,
  p_peso_g integer DEFAULT 100,
  p_largura_cm numeric DEFAULT 11,
  p_altura_cm numeric DEFAULT 2,
  p_comprimento_cm numeric DEFAULT 16
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.produtos
    (nome_comercial, principio_ativo, forma_farmaceutica, concentracao_cbd, concentracao_thc,
     fabricante, volume_quantidade, imagem_url, status,
     peso_g, largura_cm, altura_cm, comprimento_cm)
  VALUES
    (
      p_nome_comercial,
      p_principio_ativo,
      p_forma_farmaceutica::forma_farmaceutica,
      NULLIF(p_concentracao_cbd, ''),
      NULLIF(p_concentracao_thc, ''),
      NULLIF(p_fabricante, ''),
      NULLIF(p_volume_quantidade, ''),
      NULLIF(p_imagem_url, ''),
      COALESCE(p_status, 'ativo')::status_generico,
      p_peso_g,
      p_largura_cm,
      p_altura_cm,
      p_comprimento_cm
    )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_produto(text, text, text, text, text, text, text, text, text, integer, numeric, numeric, numeric) TO authenticated;
