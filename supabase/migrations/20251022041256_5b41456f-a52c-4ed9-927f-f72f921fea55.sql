-- Corrigir função de criar associação com o tipo correto
CREATE OR REPLACE FUNCTION public.admin_create_associacao(
  p_nome text,
  p_tipo text,
  p_cnpj text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_regiao text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_endereco text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO associacoes_marcas (nome, tipo, cnpj, email, telefone, regiao, cidade, estado, endereco, observacoes, status)
  VALUES (p_nome, p_tipo::tipo_fornecedor, p_cnpj, p_email, p_telefone, p_regiao, p_cidade, p_estado, p_endereco, p_observacoes, 'ativo')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_create_associacao(text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;