-- Aditivo módulo 18 (Pacientes): RG, endereço estruturado, anamnese, prontuários
-- + RPCs drill-down (consultas/receitas/pedidos/prontuarios) + anamnese CRUD
-- + admin_get_paciente / admin_update_paciente atualizados

-- ============================================
-- 1. Schema: pacientes RG + endereço estruturado
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pacientes' AND column_name='rg'
  ) THEN
    ALTER TABLE public.pacientes
      ADD COLUMN rg TEXT,
      ADD COLUMN endereco_logradouro TEXT,
      ADD COLUMN endereco_numero TEXT,
      ADD COLUMN endereco_complemento TEXT,
      ADD COLUMN bairro TEXT,
      ADD COLUMN cidade TEXT,
      ADD COLUMN estado TEXT,
      ADD COLUMN cep TEXT;
  END IF;
END $$;

-- Nota: enum values (procuracao, prontuario) aplicados em migration
-- separada 20260528135500_tipo_documento_add.sql porque ALTER TYPE ADD VALUE
-- não pode rodar na mesma transação onde o enum é usado.

-- ============================================
-- 3. Tabela paciente_anamnese
-- ============================================
CREATE TABLE IF NOT EXISTS public.paciente_anamnese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL UNIQUE REFERENCES public.pacientes(id) ON DELETE CASCADE,
  peso NUMERIC(5,2),
  altura NUMERIC(4,2),
  tem_alergias BOOLEAN,
  alergias_detalhes TEXT,
  tem_tratamentos_anteriores BOOLEAN,
  tratamentos_anteriores_detalhes TEXT,
  tem_comorbidades BOOLEAN,
  comorbidades_detalhes TEXT,
  tem_medicacoes_atuais BOOLEAN,
  medicacoes_atuais_detalhes TEXT,
  tem_exames_recentes BOOLEAN,
  exames_recentes_detalhes TEXT,
  produtos_cannabis_utilizados TEXT,
  tem_reacoes_adversas BOOLEAN,
  reacoes_adversas_detalhes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.paciente_anamnese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read anamnese" ON public.paciente_anamnese;
CREATE POLICY "Admins read anamnese"
ON public.paciente_anamnese FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 4. Tabela prontuarios
-- ============================================
CREATE TABLE IF NOT EXISTS public.prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  conteudo JSONB,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','finalizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prontuarios_paciente ON public.prontuarios(paciente_id, created_at DESC);

ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read prontuarios" ON public.prontuarios;
CREATE POLICY "Admins read prontuarios"
ON public.prontuarios FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 5. admin_get_paciente: + rg + endereço estruturado + sexo
-- ============================================
DROP FUNCTION IF EXISTS public.admin_get_paciente(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_paciente(p_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nome_completo text,
  email text,
  telefone text,
  cpf text,
  rg text,
  data_nascimento date,
  endereco_completo text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  sexo text,
  genero text,
  total_consultas integer,
  total_receitas integer,
  total_pedidos integer,
  ultimo_acesso timestamp with time zone,
  created_at timestamp with time zone,
  ativo boolean,
  foto_perfil_url text,
  observacoes_admin text
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
    p.id,
    p.user_id,
    pr.nome_completo,
    au.email::text,
    pr.telefone,
    p.cpf,
    p.rg,
    p.data_nascimento,
    p.endereco_completo,
    p.endereco_logradouro,
    p.endereco_numero,
    p.endereco_complemento,
    p.bairro,
    p.cidade,
    p.estado,
    p.cep,
    p.sexo,
    p.genero,
    p.total_consultas,
    p.total_receitas,
    p.total_pedidos,
    p.ultimo_acesso,
    p.created_at,
    pr.ativo,
    pr.foto_perfil_url,
    p.observacoes_admin
  FROM pacientes p
  INNER JOIN profiles pr ON pr.id = p.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.id = p_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente(uuid) TO anon, authenticated;

-- ============================================
-- 6. admin_update_paciente: aceitar rg + endereço estruturado
-- ============================================
DROP FUNCTION IF EXISTS public.admin_update_paciente(uuid, text, text, date, text);

CREATE OR REPLACE FUNCTION public.admin_update_paciente(
  p_id uuid,
  p_telefone text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_data_nascimento date DEFAULT NULL,
  p_endereco_completo text DEFAULT NULL,
  p_rg text DEFAULT NULL,
  p_endereco_logradouro text DEFAULT NULL,
  p_endereco_numero text DEFAULT NULL,
  p_endereco_complemento text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_cidade text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_cep text DEFAULT NULL,
  p_sexo text DEFAULT NULL,
  p_genero text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE pacientes
  SET
    cpf = COALESCE(p_cpf, cpf),
    rg = COALESCE(p_rg, rg),
    data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
    endereco_completo = COALESCE(p_endereco_completo, endereco_completo),
    endereco_logradouro = COALESCE(p_endereco_logradouro, endereco_logradouro),
    endereco_numero = COALESCE(p_endereco_numero, endereco_numero),
    endereco_complemento = COALESCE(p_endereco_complemento, endereco_complemento),
    bairro = COALESCE(p_bairro, bairro),
    cidade = COALESCE(p_cidade, cidade),
    estado = COALESCE(p_estado, estado),
    cep = COALESCE(p_cep, cep),
    sexo = COALESCE(p_sexo, sexo),
    genero = COALESCE(p_genero, genero),
    updated_at = NOW()
  WHERE id = p_id;

  IF p_telefone IS NOT NULL THEN
    UPDATE profiles SET telefone = p_telefone, updated_at = NOW()
    WHERE id = (SELECT user_id FROM pacientes WHERE id = p_id);
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_paciente(uuid, text, text, date, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;

-- ============================================
-- 7. Drill-downs: consultas / receitas / pedidos
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_paciente_consultas(
  p_paciente_id uuid,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  data_consulta timestamp with time zone,
  status text,
  queixa_principal text,
  medico_nome text,
  receita_id uuid
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
    c.id,
    c.data_consulta,
    c.status::text,
    c.queixa_principal,
    m.nome,
    c.receita_id
  FROM consultas c
  LEFT JOIN medicos m ON m.id = c.medico_id
  WHERE c.paciente_id = p_paciente_id
  ORDER BY c.data_consulta DESC
  LIMIT GREATEST(COALESCE(p_limit, 200), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente_consultas(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_paciente_receitas(
  p_paciente_id uuid,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  numero_receita text,
  data_emissao timestamp with time zone,
  validade timestamp with time zone,
  status text,
  medico_nome text,
  documento_url text
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
    r.id,
    r.numero_receita,
    r.data_emissao,
    r.validade,
    r.status::text,
    m.nome,
    r.documento_url
  FROM receitas r
  INNER JOIN medicos m ON m.id = r.medico_id
  WHERE r.paciente_id = p_paciente_id
  ORDER BY r.data_emissao DESC
  LIMIT GREATEST(COALESCE(p_limit, 200), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente_receitas(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_paciente_pedidos(
  p_paciente_id uuid,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  numero_pedido text,
  data_pedido timestamp with time zone,
  valor_total numeric,
  status text,
  status_anvisa text,
  canal_aquisicao text
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
    p.id,
    p.numero_pedido,
    p.data_pedido,
    p.valor_total,
    p.status::text,
    p.status_anvisa,
    p.canal_aquisicao::text
  FROM pedidos p
  WHERE p.paciente_id = p_paciente_id
  ORDER BY p.data_pedido DESC
  LIMIT GREATEST(COALESCE(p_limit, 200), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente_pedidos(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_paciente_prontuarios(
  p_paciente_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  consulta_id uuid,
  medico_nome text,
  status text,
  arquivo_url text,
  created_at timestamp with time zone
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
    pr.id,
    pr.consulta_id,
    m.nome,
    pr.status,
    pr.arquivo_url,
    pr.created_at
  FROM prontuarios pr
  LEFT JOIN medicos m ON m.id = pr.medico_id
  WHERE pr.paciente_id = p_paciente_id
  ORDER BY pr.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente_prontuarios(uuid, integer) TO anon, authenticated;

-- ============================================
-- 8. Anamnese: get + upsert
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_get_paciente_anamnese(p_paciente_id uuid)
RETURNS TABLE(
  peso numeric,
  altura numeric,
  tem_alergias boolean,
  alergias_detalhes text,
  tem_tratamentos_anteriores boolean,
  tratamentos_anteriores_detalhes text,
  tem_comorbidades boolean,
  comorbidades_detalhes text,
  tem_medicacoes_atuais boolean,
  medicacoes_atuais_detalhes text,
  tem_exames_recentes boolean,
  exames_recentes_detalhes text,
  produtos_cannabis_utilizados text,
  tem_reacoes_adversas boolean,
  reacoes_adversas_detalhes text,
  updated_at timestamp with time zone
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
    a.peso, a.altura,
    a.tem_alergias, a.alergias_detalhes,
    a.tem_tratamentos_anteriores, a.tratamentos_anteriores_detalhes,
    a.tem_comorbidades, a.comorbidades_detalhes,
    a.tem_medicacoes_atuais, a.medicacoes_atuais_detalhes,
    a.tem_exames_recentes, a.exames_recentes_detalhes,
    a.produtos_cannabis_utilizados,
    a.tem_reacoes_adversas, a.reacoes_adversas_detalhes,
    a.updated_at
  FROM paciente_anamnese a
  WHERE a.paciente_id = p_paciente_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_paciente_anamnese(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_paciente_anamnese(
  p_paciente_id uuid,
  p_peso numeric DEFAULT NULL,
  p_altura numeric DEFAULT NULL,
  p_tem_alergias boolean DEFAULT NULL,
  p_alergias_detalhes text DEFAULT NULL,
  p_tem_tratamentos_anteriores boolean DEFAULT NULL,
  p_tratamentos_anteriores_detalhes text DEFAULT NULL,
  p_tem_comorbidades boolean DEFAULT NULL,
  p_comorbidades_detalhes text DEFAULT NULL,
  p_tem_medicacoes_atuais boolean DEFAULT NULL,
  p_medicacoes_atuais_detalhes text DEFAULT NULL,
  p_tem_exames_recentes boolean DEFAULT NULL,
  p_exames_recentes_detalhes text DEFAULT NULL,
  p_produtos_cannabis_utilizados text DEFAULT NULL,
  p_tem_reacoes_adversas boolean DEFAULT NULL,
  p_reacoes_adversas_detalhes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO paciente_anamnese (
    paciente_id, peso, altura,
    tem_alergias, alergias_detalhes,
    tem_tratamentos_anteriores, tratamentos_anteriores_detalhes,
    tem_comorbidades, comorbidades_detalhes,
    tem_medicacoes_atuais, medicacoes_atuais_detalhes,
    tem_exames_recentes, exames_recentes_detalhes,
    produtos_cannabis_utilizados,
    tem_reacoes_adversas, reacoes_adversas_detalhes,
    updated_at, updated_by
  ) VALUES (
    p_paciente_id, p_peso, p_altura,
    p_tem_alergias, p_alergias_detalhes,
    p_tem_tratamentos_anteriores, p_tratamentos_anteriores_detalhes,
    p_tem_comorbidades, p_comorbidades_detalhes,
    p_tem_medicacoes_atuais, p_medicacoes_atuais_detalhes,
    p_tem_exames_recentes, p_exames_recentes_detalhes,
    p_produtos_cannabis_utilizados,
    p_tem_reacoes_adversas, p_reacoes_adversas_detalhes,
    NOW(), auth.uid()
  )
  ON CONFLICT (paciente_id) DO UPDATE SET
    peso = COALESCE(EXCLUDED.peso, paciente_anamnese.peso),
    altura = COALESCE(EXCLUDED.altura, paciente_anamnese.altura),
    tem_alergias = COALESCE(EXCLUDED.tem_alergias, paciente_anamnese.tem_alergias),
    alergias_detalhes = COALESCE(EXCLUDED.alergias_detalhes, paciente_anamnese.alergias_detalhes),
    tem_tratamentos_anteriores = COALESCE(EXCLUDED.tem_tratamentos_anteriores, paciente_anamnese.tem_tratamentos_anteriores),
    tratamentos_anteriores_detalhes = COALESCE(EXCLUDED.tratamentos_anteriores_detalhes, paciente_anamnese.tratamentos_anteriores_detalhes),
    tem_comorbidades = COALESCE(EXCLUDED.tem_comorbidades, paciente_anamnese.tem_comorbidades),
    comorbidades_detalhes = COALESCE(EXCLUDED.comorbidades_detalhes, paciente_anamnese.comorbidades_detalhes),
    tem_medicacoes_atuais = COALESCE(EXCLUDED.tem_medicacoes_atuais, paciente_anamnese.tem_medicacoes_atuais),
    medicacoes_atuais_detalhes = COALESCE(EXCLUDED.medicacoes_atuais_detalhes, paciente_anamnese.medicacoes_atuais_detalhes),
    tem_exames_recentes = COALESCE(EXCLUDED.tem_exames_recentes, paciente_anamnese.tem_exames_recentes),
    exames_recentes_detalhes = COALESCE(EXCLUDED.exames_recentes_detalhes, paciente_anamnese.exames_recentes_detalhes),
    produtos_cannabis_utilizados = COALESCE(EXCLUDED.produtos_cannabis_utilizados, paciente_anamnese.produtos_cannabis_utilizados),
    tem_reacoes_adversas = COALESCE(EXCLUDED.tem_reacoes_adversas, paciente_anamnese.tem_reacoes_adversas),
    reacoes_adversas_detalhes = COALESCE(EXCLUDED.reacoes_adversas_detalhes, paciente_anamnese.reacoes_adversas_detalhes),
    updated_at = NOW(),
    updated_by = auth.uid();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_paciente_anamnese(uuid, numeric, numeric, boolean, text, boolean, text, boolean, text, boolean, text, boolean, text, text, boolean, text) TO anon, authenticated;
