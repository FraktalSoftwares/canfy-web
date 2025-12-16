-- Function to inactivate a product securely
CREATE OR REPLACE FUNCTION public.inativar_produto(p_produto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins/super_admins can inactivate
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.produtos
  SET status = 'inativo'::status_generico
  WHERE id = p_produto_id;
END;
$$;