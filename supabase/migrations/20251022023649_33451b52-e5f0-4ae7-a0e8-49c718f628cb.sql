-- ====================================
-- FASE 1: FUNDAÇÃO - AUTENTICAÇÃO E USUÁRIOS
-- ====================================

-- Enum para tipo de usuário
CREATE TYPE public.tipo_usuario AS ENUM ('admin', 'medico', 'paciente');

-- Enum para roles (RBAC)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'gestor', 'visualizador');

-- 1.1 Tabela profiles (estende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  foto_perfil_url TEXT,
  tipo_usuario tipo_usuario NOT NULL DEFAULT 'paciente',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.2 Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 1.3 Tabela user_permissions
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  modulo TEXT NOT NULL CHECK (modulo IN ('acessos', 'usuarios', 'receitas', 'produtos', 'associacoes')),
  pode_acessar BOOLEAN NOT NULL DEFAULT true,
  pode_editar BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, modulo)
);

-- ====================================
-- FASE 2: ENTIDADES PRINCIPAIS - MÉDICOS E PACIENTES
-- ====================================

-- 2.1 Tabela especialidades
CREATE TABLE public.especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enum para status do médico
CREATE TYPE public.status_medico AS ENUM ('ativo', 'inativo', 'pendente_aprovacao');

-- 2.2 Tabela medicos
CREATE TABLE public.medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  crm TEXT NOT NULL UNIQUE,
  uf_crm TEXT NOT NULL,
  especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
  status status_medico NOT NULL DEFAULT 'pendente_aprovacao',
  total_atendimentos INTEGER NOT NULL DEFAULT 0,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.3 Tabela pacientes
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  data_nascimento DATE NOT NULL,
  endereco_completo TEXT,
  total_consultas INTEGER NOT NULL DEFAULT 0,
  total_pedidos INTEGER NOT NULL DEFAULT 0,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ====================================
-- FASE 3: CATÁLOGO - PRODUTOS E FORNECEDORES
-- ====================================

-- Enum para tipo de fornecedor
CREATE TYPE public.tipo_fornecedor AS ENUM ('associacao', 'marca');

-- Enum para status genérico
CREATE TYPE public.status_generico AS ENUM ('ativo', 'inativo');

-- 3.1 Tabela associacoes_marcas
CREATE TABLE public.associacoes_marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo tipo_fornecedor NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  regiao TEXT,
  observacoes TEXT,
  status status_generico NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.2 Tabela indicacoes_clinicas
CREATE TABLE public.indicacoes_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enum para forma farmacêutica
CREATE TYPE public.forma_farmaceutica AS ENUM ('oleo', 'capsula', 'spray', 'gel', 'creme', 'outro');

-- 3.3 Tabela produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_comercial TEXT NOT NULL,
  principio_ativo TEXT NOT NULL,
  concentracao_thc TEXT,
  concentracao_cbd TEXT,
  forma_farmaceutica forma_farmaceutica NOT NULL,
  volume_quantidade TEXT,
  fabricante TEXT,
  associacao_marca_id UUID REFERENCES public.associacoes_marcas(id) ON DELETE SET NULL,
  imagem_url TEXT,
  status status_generico NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3.4 Tabela produto_indicacoes (N:N)
CREATE TABLE public.produto_indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  indicacao_id UUID REFERENCES public.indicacoes_clinicas(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (produto_id, indicacao_id)
);

-- ====================================
-- FASE 4: CORE DO NEGÓCIO - RECEITAS E PEDIDOS
-- ====================================

-- Enum para status da receita
CREATE TYPE public.status_receita AS ENUM ('ativa', 'utilizada', 'expirada', 'cancelada');

-- 4.1 Tabela receitas
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_receita TEXT NOT NULL UNIQUE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE RESTRICT NOT NULL,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE RESTRICT NOT NULL,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validade DATE NOT NULL,
  observacoes TEXT,
  status status_receita NOT NULL DEFAULT 'ativa',
  documento_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4.2 Tabela receita_itens
CREATE TABLE public.receita_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id UUID REFERENCES public.receitas(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE RESTRICT NOT NULL,
  posologia TEXT NOT NULL,
  quantidade_prescrita INTEGER NOT NULL,
  duracao_tratamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enum para status do pedido
CREATE TYPE public.status_pedido AS ENUM ('pendente', 'aprovado', 'em_analise', 'recusado', 'cancelado', 'em_separacao', 'enviado', 'entregue');

-- Enum para canal de aquisição
CREATE TYPE public.canal_aquisicao AS ENUM ('associacao', 'marca', 'outro');

-- 4.3 Tabela pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE RESTRICT NOT NULL,
  associacao_marca_id UUID REFERENCES public.associacoes_marcas(id) ON DELETE SET NULL,
  data_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valor_total DECIMAL(10, 2),
  forma_pagamento TEXT,
  status status_pedido NOT NULL DEFAULT 'pendente',
  canal_aquisicao canal_aquisicao NOT NULL DEFAULT 'associacao',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4.4 Tabela pedido_itens
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE RESTRICT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10, 2),
  preco_total DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4.5 Tabela pedido_historico
CREATE TABLE public.pedido_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ====================================
-- FASE 5: COMPLEMENTOS - DOCUMENTOS E NOTIFICAÇÕES
-- ====================================

-- Enum para tipo de documento
CREATE TYPE public.tipo_documento AS ENUM ('laudo_medico', 'exame', 'identidade', 'comprovante_residencia', 'autorizacao_anvisa', 'outro');

-- 5.1 Tabela documentos
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo tipo_documento NOT NULL,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  enviado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enum para tipo de notificação
CREATE TYPE public.tipo_notificacao AS ENUM ('sistema', 'personalizada');

-- Enum para categoria de notificação
CREATE TYPE public.categoria_notificacao AS ENUM ('financeira', 'gestao_usuarios', 'gestao_pedidos', 'catalogo', 'alertas_tecnicos', 'engajamento', 'riscos', 'geral');

-- Enum para destinatário tipo
CREATE TYPE public.destinatario_tipo AS ENUM ('todos', 'todos_medicos', 'todos_pacientes', 'especifico');

-- Enum para tipo de envio
CREATE TYPE public.tipo_envio AS ENUM ('imediato', 'agendado');

-- 5.2 Tabela notificacoes
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_notificacao NOT NULL DEFAULT 'sistema',
  categoria categoria_notificacao NOT NULL DEFAULT 'geral',
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  destinatario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  destinatario_tipo destinatario_tipo NOT NULL DEFAULT 'especifico',
  tipo_envio tipo_envio NOT NULL DEFAULT 'imediato',
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5.3 Tabela preferencias_notificacoes
CREATE TABLE public.preferencias_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notif_email BOOLEAN NOT NULL DEFAULT true,
  notif_sms BOOLEAN NOT NULL DEFAULT false,
  notif_push BOOLEAN NOT NULL DEFAULT true,
  tipos_consultas BOOLEAN NOT NULL DEFAULT true,
  tipos_entregas BOOLEAN NOT NULL DEFAULT true,
  tipos_anvisa BOOLEAN NOT NULL DEFAULT true,
  tipos_novas_receitas BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ====================================
-- FASE 6: ANALYTICS - AUDITORIA E MÉTRICAS
-- ====================================

-- 6.1 Tabela logs_auditoria
CREATE TABLE public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela_afetada TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6.2 Tabela metricas_diarias
CREATE TABLE public.metricas_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  total_pacientes_ativos INTEGER NOT NULL DEFAULT 0,
  total_consultas_realizadas INTEGER NOT NULL DEFAULT 0,
  total_pedidos_ativos INTEGER NOT NULL DEFAULT 0,
  total_pedidos_concluidos INTEGER NOT NULL DEFAULT 0,
  total_medicos_ativos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ====================================
-- FUNÇÕES E TRIGGERS
-- ====================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medicos_updated_at BEFORE UPDATE ON public.medicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_associacoes_marcas_updated_at BEFORE UPDATE ON public.associacoes_marcas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_preferencias_notificacoes_updated_at BEFORE UPDATE ON public.preferencias_notificacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, telefone, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    COALESCE((NEW.raw_user_meta_data->>'tipo_usuario')::tipo_usuario, 'paciente')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar profile ao registrar
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função has_role (SECURITY DEFINER para evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para gerar número de receita
CREATE OR REPLACE FUNCTION public.gerar_numero_receita()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Função para gerar número de pedido
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TEXT
LANGUAGE plpgsql
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

-- ====================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================

-- Índices em FKs
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_medicos_user_id ON public.medicos(user_id);
CREATE INDEX idx_medicos_especialidade_id ON public.medicos(especialidade_id);
CREATE INDEX idx_pacientes_user_id ON public.pacientes(user_id);
CREATE INDEX idx_produtos_associacao_marca_id ON public.produtos(associacao_marca_id);
CREATE INDEX idx_produto_indicacoes_produto_id ON public.produto_indicacoes(produto_id);
CREATE INDEX idx_produto_indicacoes_indicacao_id ON public.produto_indicacoes(indicacao_id);
CREATE INDEX idx_receitas_medico_id ON public.receitas(medico_id);
CREATE INDEX idx_receitas_paciente_id ON public.receitas(paciente_id);
CREATE INDEX idx_receita_itens_receita_id ON public.receita_itens(receita_id);
CREATE INDEX idx_receita_itens_produto_id ON public.receita_itens(produto_id);
CREATE INDEX idx_pedidos_paciente_id ON public.pedidos(paciente_id);
CREATE INDEX idx_pedidos_receita_id ON public.pedidos(receita_id);
CREATE INDEX idx_pedidos_associacao_marca_id ON public.pedidos(associacao_marca_id);
CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_produto_id ON public.pedido_itens(produto_id);
CREATE INDEX idx_pedido_historico_pedido_id ON public.pedido_historico(pedido_id);
CREATE INDEX idx_documentos_paciente_id ON public.documentos(paciente_id);
CREATE INDEX idx_documentos_medico_id ON public.documentos(medico_id);
CREATE INDEX idx_notificacoes_destinatario_id ON public.notificacoes(destinatario_id);
CREATE INDEX idx_preferencias_notificacoes_user_id ON public.preferencias_notificacoes(user_id);
CREATE INDEX idx_logs_auditoria_user_id ON public.logs_auditoria(user_id);

-- Índices em campos de busca
CREATE INDEX idx_medicos_crm ON public.medicos(crm);
CREATE INDEX idx_medicos_email ON public.medicos(email);
CREATE INDEX idx_pacientes_cpf ON public.pacientes(cpf);
CREATE INDEX idx_receitas_numero_receita ON public.receitas(numero_receita);
CREATE INDEX idx_pedidos_numero_pedido ON public.pedidos(numero_pedido);
CREATE INDEX idx_associacoes_marcas_cnpj ON public.associacoes_marcas(cnpj);

-- Índices em status e datas
CREATE INDEX idx_medicos_status ON public.medicos(status);
CREATE INDEX idx_receitas_status ON public.receitas(status);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_receitas_data_emissao ON public.receitas(data_emissao);
CREATE INDEX idx_pedidos_data_pedido ON public.pedidos(data_pedido);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX idx_metricas_diarias_data ON public.metricas_diarias(data);

-- ====================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associacoes_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicacoes_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para user_permissions
CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all permissions" ON public.user_permissions FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para especialidades (leitura pública para usuários autenticados)
CREATE POLICY "Authenticated users can view especialidades" ON public.especialidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage especialidades" ON public.especialidades FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para medicos
CREATE POLICY "Authenticated users can view active medicos" ON public.medicos FOR SELECT TO authenticated USING (status = 'ativo');
CREATE POLICY "Admins can manage all medicos" ON public.medicos FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para pacientes
CREATE POLICY "Pacientes can view their own data" ON public.pacientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Medicos and Admins can view pacientes" ON public.pacientes FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage pacientes" ON public.pacientes FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para associacoes_marcas
CREATE POLICY "Authenticated users can view associacoes_marcas" ON public.associacoes_marcas FOR SELECT TO authenticated USING (status = 'ativo');
CREATE POLICY "Admins can manage associacoes_marcas" ON public.associacoes_marcas FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para indicacoes_clinicas
CREATE POLICY "Authenticated users can view indicacoes_clinicas" ON public.indicacoes_clinicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage indicacoes_clinicas" ON public.indicacoes_clinicas FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para produtos
CREATE POLICY "Authenticated users can view active produtos" ON public.produtos FOR SELECT TO authenticated USING (status = 'ativo');
CREATE POLICY "Admins can manage produtos" ON public.produtos FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para produto_indicacoes
CREATE POLICY "Authenticated users can view produto_indicacoes" ON public.produto_indicacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage produto_indicacoes" ON public.produto_indicacoes FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para receitas
CREATE POLICY "Pacientes can view their own receitas" ON public.receitas FOR SELECT USING (EXISTS (SELECT 1 FROM public.pacientes WHERE id = receitas.paciente_id AND user_id = auth.uid()));
CREATE POLICY "Medicos can view receitas they created" ON public.receitas FOR SELECT USING (EXISTS (SELECT 1 FROM public.medicos WHERE id = receitas.medico_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all receitas" ON public.receitas FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para receita_itens
CREATE POLICY "Users can view receita_itens of their receitas" ON public.receita_itens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.receitas r
    LEFT JOIN public.pacientes p ON r.paciente_id = p.id
    LEFT JOIN public.medicos m ON r.medico_id = m.id
    WHERE r.id = receita_itens.receita_id
    AND (p.user_id = auth.uid() OR m.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Admins can manage receita_itens" ON public.receita_itens FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para pedidos
CREATE POLICY "Pacientes can view their own pedidos" ON public.pedidos FOR SELECT USING (EXISTS (SELECT 1 FROM public.pacientes WHERE id = pedidos.paciente_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all pedidos" ON public.pedidos FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para pedido_itens
CREATE POLICY "Users can view pedido_itens of their pedidos" ON public.pedido_itens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    LEFT JOIN public.pacientes pac ON p.paciente_id = pac.id
    WHERE p.id = pedido_itens.pedido_id
    AND (pac.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Admins can manage pedido_itens" ON public.pedido_itens FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para pedido_historico
CREATE POLICY "Users can view historico of their pedidos" ON public.pedido_historico FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    LEFT JOIN public.pacientes pac ON p.paciente_id = pac.id
    WHERE p.id = pedido_historico.pedido_id
    AND (pac.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Admins can manage pedido_historico" ON public.pedido_historico FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para documentos
CREATE POLICY "Users can view their own documentos" ON public.documentos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pacientes WHERE id = documentos.paciente_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.medicos WHERE id = documentos.medico_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all documentos" ON public.documentos FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para notificacoes
CREATE POLICY "Users can view their own notificacoes" ON public.notificacoes FOR SELECT USING (destinatario_id = auth.uid() OR destinatario_tipo IN ('todos', 'todos_medicos', 'todos_pacientes'));
CREATE POLICY "Users can update their own notificacoes" ON public.notificacoes FOR UPDATE USING (destinatario_id = auth.uid());
CREATE POLICY "Admins can manage all notificacoes" ON public.notificacoes FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para preferencias_notificacoes
CREATE POLICY "Users can view their own preferencias" ON public.preferencias_notificacoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own preferencias" ON public.preferencias_notificacoes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own preferencias" ON public.preferencias_notificacoes FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas para logs_auditoria (somente admins)
CREATE POLICY "Admins can view logs_auditoria" ON public.logs_auditoria FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para metricas_diarias (somente admins)
CREATE POLICY "Admins can view metricas_diarias" ON public.metricas_diarias FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage metricas_diarias" ON public.metricas_diarias FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ====================================
-- DADOS INICIAIS
-- ====================================

-- Inserir especialidades padrão
INSERT INTO public.especialidades (nome, descricao) VALUES
  ('Clínica Médica', 'Especialidade médica generalista'),
  ('Neurologia', 'Tratamento de doenças do sistema nervoso'),
  ('Psiquiatria', 'Tratamento de transtornos mentais'),
  ('Oncologia', 'Tratamento de câncer'),
  ('Ortopedia', 'Tratamento de problemas musculoesqueléticos'),
  ('Reumatologia', 'Tratamento de doenças reumáticas'),
  ('Dermatologia', 'Tratamento de doenças da pele'),
  ('Pediatria', 'Atendimento médico infantil');

-- Inserir indicações clínicas padrão
INSERT INTO public.indicacoes_clinicas (nome, descricao) VALUES
  ('Dor Crônica', 'Tratamento de dores persistentes'),
  ('Ansiedade', 'Tratamento de transtornos de ansiedade'),
  ('Insônia', 'Tratamento de distúrbios do sono'),
  ('Epilepsia', 'Tratamento de crises epilépticas'),
  ('Esclerose Múltipla', 'Tratamento de sintomas da esclerose múltipla'),
  ('Náusea e Vômito', 'Controle de náuseas e vômitos'),
  ('Perda de Apetite', 'Estímulo do apetite'),
  ('Espasticidade', 'Redução de espasmos musculares');