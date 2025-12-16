-- Criar associações de exemplo
DO $$
DECLARE
  v_assoc1_id uuid;
  v_assoc2_id uuid;
  v_assoc3_id uuid;
BEGIN
  -- Criar associações exemplo
  SELECT id INTO v_assoc1_id FROM associacoes_marcas WHERE nome = 'Associação Canábica Brasil' LIMIT 1;
  IF v_assoc1_id IS NULL THEN
    INSERT INTO associacoes_marcas (nome, tipo, cnpj, email, telefone, regiao, cidade, estado, endereco, status, observacoes)
    VALUES 
      ('Associação Canábica Brasil', 'associacao', '12.345.678/0001-90', 'contato@asscanabica.com.br', '(11) 98765-4321', 'Sudeste', 'São Paulo', 'SP', 'Rua das Orquídeas, 99 - Floresta', 'ativo', 'Atendimento prioritário para novos médicos'),
      ('Instituto de Saúde Natural', 'associacao', '98.765.432/0001-12', 'contato@institutosaude.com.br', '(81) 91234-5678', 'Nordeste', 'Recife', 'PE', 'Rua da Aurora, 555 - Santo Amaro', 'ativo', NULL),
      ('CBD Living Marca', 'marca', NULL, 'vendas@cbdliving.com.br', '(21) 99876-5432', 'Sudeste', 'Rio de Janeiro', 'RJ', 'Praça Mauá, 12 - Centro', 'ativo', 'Fornecedor internacional'),
      ('Coletivo de Medicina Integrativa', 'associacao', '11.222.333/0001-44', 'info@coletivomed.com.br', '(11) 97777-8888', 'Sudeste', 'São Paulo', 'SP', 'Rua Rego Freitas, 333 - República', 'ativo', NULL),
      ('HempLucid Brasil', 'marca', '55.666.777/0001-88', 'contato@hemplucid.com.br', NULL, 'Sul', 'Curitiba', 'PR', 'Av. Sete de Setembro, 1000', 'inativo', 'Marca descontinuada');
  END IF;
END $$;

-- Função para listar associações (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_list_associacoes()
RETURNS TABLE (
  id uuid,
  nome text,
  tipo text,
  cnpj text,
  email text,
  telefone text,
  regiao text,
  cidade text,
  estado text,
  endereco text,
  status text,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
  SELECT 
    a.id,
    a.nome,
    a.tipo::text,
    a.cnpj,
    a.email,
    a.telefone,
    a.regiao,
    a.cidade,
    a.estado,
    a.endereco,
    a.status::text,
    a.observacoes,
    a.created_at,
    a.updated_at
  FROM associacoes_marcas a
  ORDER BY a.created_at DESC
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_list_associacoes() TO anon, authenticated;

-- Função para obter associação específica (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_get_associacao(p_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  tipo text,
  cnpj text,
  email text,
  telefone text,
  regiao text,
  cidade text,
  estado text,
  endereco text,
  status text,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
  SELECT 
    a.id,
    a.nome,
    a.tipo::text,
    a.cnpj,
    a.email,
    a.telefone,
    a.regiao,
    a.cidade,
    a.estado,
    a.endereco,
    a.status::text,
    a.observacoes,
    a.created_at,
    a.updated_at
  FROM associacoes_marcas a
  WHERE a.id = p_id
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_get_associacao(uuid) TO anon, authenticated;

-- Função para criar associação (contorna RLS)
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
  VALUES (p_nome, p_tipo::tipo_associacao_marca, p_cnpj, p_email, p_telefone, p_regiao, p_cidade, p_estado, p_endereco, p_observacoes, 'ativo')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_create_associacao(text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;

-- Função para atualizar associação (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_update_associacao(
  p_id uuid,
  p_nome text,
  p_cnpj text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_regiao text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE associacoes_marcas
  SET 
    nome = p_nome,
    cnpj = p_cnpj,
    email = p_email,
    telefone = p_telefone,
    regiao = p_regiao,
    observacoes = p_observacoes,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_update_associacao(uuid, text, text, text, text, text, text) TO anon, authenticated;

-- Função para inativar associação (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_inativar_associacao(p_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE associacoes_marcas
  SET status = 'inativo'::status_generico, updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_inativar_associacao(uuid) TO anon, authenticated;