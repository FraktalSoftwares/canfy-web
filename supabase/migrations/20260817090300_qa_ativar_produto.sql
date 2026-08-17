-- QA: não é possível ativar um produto inativo.
-- Causa: a funcionalidade não existia — só havia inativar_produto. Ativar
-- exige dados completos de envio (Melhor Envio) e preço, para não deixar
-- um produto ativo que quebre a cotação de frete.
CREATE OR REPLACE FUNCTION public.ativar_produto(p_produto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_produto public.produtos;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_produto FROM public.produtos WHERE id = p_produto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'produto não encontrado';
  END IF;

  IF v_produto.preco IS NULL OR v_produto.preco <= 0 THEN
    RAISE EXCEPTION 'Preço é obrigatório e deve ser maior que zero para ativar o produto.';
  END IF;

  IF v_produto.peso_g IS NULL OR v_produto.peso_g < 1 OR v_produto.peso_g > 30000 THEN
    RAISE EXCEPTION 'Peso (g) é obrigatório e deve estar entre 1 e 30000 para ativar o produto.';
  END IF;

  IF v_produto.largura_cm IS NULL OR v_produto.largura_cm < 11 OR v_produto.largura_cm > 105 THEN
    RAISE EXCEPTION 'Largura (cm) é obrigatória e deve estar entre 11 e 105 para ativar o produto.';
  END IF;

  IF v_produto.altura_cm IS NULL OR v_produto.altura_cm < 2 OR v_produto.altura_cm > 105 THEN
    RAISE EXCEPTION 'Altura (cm) é obrigatória e deve estar entre 2 e 105 para ativar o produto.';
  END IF;

  IF v_produto.comprimento_cm IS NULL OR v_produto.comprimento_cm < 16 OR v_produto.comprimento_cm > 105 THEN
    RAISE EXCEPTION 'Comprimento (cm) é obrigatório e deve estar entre 16 e 105 para ativar o produto.';
  END IF;

  UPDATE public.produtos
  SET status = 'ativo'::status_generico, updated_at = NOW()
  WHERE id = p_produto_id;
END;
$function$;
