-- Criar especialidades se não existem e médicos de exemplo
DO $$
DECLARE
  v_esp_id uuid;
BEGIN
  -- Criar especialidades
  SELECT id INTO v_esp_id FROM especialidades WHERE nome = 'Clínico Geral' LIMIT 1;
  IF v_esp_id IS NULL THEN
    INSERT INTO especialidades (nome, descricao, ativo)
    VALUES 
      ('Clínico Geral', 'Medicina geral e atendimento primário', true),
      ('Neurologista', 'Especialista em sistema nervoso', true),
      ('Psiquiatra', 'Especialista em saúde mental', true),
      ('Endocrinologista', 'Especialista em hormônios e metabolismo', true);
  END IF;
  
  -- Criar médicos exemplo
  IF NOT EXISTS (SELECT 1 FROM medicos WHERE email = 'anacsilva@example.com') THEN
    SELECT id INTO v_esp_id FROM especialidades WHERE nome = 'Clínico Geral' LIMIT 1;
    
    INSERT INTO medicos (nome, email, telefone, crm, uf_crm, especialidade_id, status, total_atendimentos, ultimo_acesso)
    VALUES 
      ('Ana Clara Silva', 'anacsilva@example.com', '(11) 98765-4321', '123456', 'SP', v_esp_id, 'ativo', 24, NOW() - INTERVAL '2 days'),
      ('João Pedro Almeida', 'joaopedro@example.com', '(21) 99876-5432', '234567', 'RJ', v_esp_id, 'ativo', 18, NOW() - INTERVAL '1 day'),
      ('Fernanda Ribeiro', 'fernandarib@example.com', '(81) 91234-5678', '345678', 'PE', v_esp_id, 'ativo', 15, NOW() - INTERVAL '3 days'),
      ('Carlos Martins', 'carlosmartins@example.com', '(11) 97777-8888', '456789', 'SP', v_esp_id, 'ativo', 32, NOW() - INTERVAL '1 hour'),
      ('Tatiane Lima', 'tatianelima@example.com', '(85) 98888-9999', '567890', 'CE', v_esp_id, 'inativo', 8, NOW() - INTERVAL '30 days');
  END IF;
END $$;

-- Função para listar médicos (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_list_medicos()
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  telefone text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  status text,
  total_atendimentos integer,
  ultimo_acesso timestamptz,
  created_at timestamptz
) AS $$
  SELECT 
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') as especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.ultimo_acesso,
    m.created_at
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  ORDER BY m.created_at DESC
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_list_medicos() TO anon, authenticated;

-- Função para obter médico específico (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_get_medico(p_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  telefone text,
  crm text,
  uf_crm text,
  especialidade_nome text,
  status text,
  total_atendimentos integer,
  ultimo_acesso timestamptz,
  created_at timestamptz,
  user_id uuid
) AS $$
  SELECT 
    m.id,
    m.nome,
    m.email,
    m.telefone,
    m.crm,
    m.uf_crm,
    COALESCE(e.nome, 'Não informado') as especialidade_nome,
    m.status::text,
    m.total_atendimentos,
    m.ultimo_acesso,
    m.created_at,
    m.user_id
  FROM medicos m
  LEFT JOIN especialidades e ON e.id = m.especialidade_id
  WHERE m.id = p_id
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_get_medico(uuid) TO anon, authenticated;

-- Função para atualizar médico (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_update_medico(
  p_id uuid,
  p_email text,
  p_telefone text,
  p_crm text,
  p_uf_crm text
)
RETURNS void AS $$
BEGIN
  UPDATE medicos
  SET 
    email = p_email,
    telefone = p_telefone,
    crm = p_crm,
    uf_crm = p_uf_crm,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_update_medico(uuid, text, text, text, text) TO anon, authenticated;

-- Função para inativar médico (contorna RLS)
CREATE OR REPLACE FUNCTION public.admin_inativar_medico(p_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE medicos
  SET status = 'inativo'::status_medico, updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_inativar_medico(uuid) TO anon, authenticated;