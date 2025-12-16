-- Secure RPC to create produtos bypassing RLS safely for authenticated users
CREATE OR REPLACE FUNCTION public.create_produto(
  p_nome_comercial text,
  p_principio_ativo text,
  p_forma_farmaceutica text,
  p_concentracao_cbd text,
  p_concentracao_thc text,
  p_fabricante text,
  p_volume_quantidade text,
  p_imagem_url text,
  p_status text
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
    (nome_comercial, principio_ativo, forma_farmaceutica, concentracao_cbd, concentracao_thc, fabricante, volume_quantidade, imagem_url, status)
  VALUES
    (
      p_nome_comercial,
      p_principio_ativo,
      p_forma_farmaceutica::forma_farmaceutica,
      NULLIF(p_concentracao_cbd, ''),
      NULLIF(p_concentracao_thc, ''),
      NULLIF(p_fabricante, ''),
      NULLIF(p_volume_quantidade, ''),
      p_imagem_url,
      COALESCE(p_status, 'ativo')::status_generico
    )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_produto(text, text, text, text, text, text, text, text, text) TO authenticated;