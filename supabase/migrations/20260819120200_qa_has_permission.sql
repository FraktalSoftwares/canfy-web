-- QA: usuário sem permissão de edição consegue alterar perfis.
--
-- Causa: user_permissions.pode_editar existe desde a migração inicial mas nunca
-- é lido. As RPCs admin_* e as edge functions autorizam apenas por role
-- ('admin' | 'super_admin'), e o painel não esconde nenhum controle de edição.
-- Como quase todos os usuários do painel são 'admin', desmarcar as caixas de
-- permissão não tinha efeito algum.
--
-- Esta migração cria has_permission() e passa a usá-la nas RPCs de escrita.
--
-- Semântica de has_permission (importante para não travar quem já usa o painel):
--   - super_admin  -> sempre permitido;
--   - linha explícita em user_permissions para (user_id, modulo) -> a linha decide;
--   - sem linha nenhuma para aquele módulo -> cai no comportamento anterior
--     (qualquer role de painel permite), porque 6 dos 9 admins atuais nunca
--     tiveram permissões configuradas e negar por omissão seria uma regressão.
-- Ou seja: desmarcar a caixa passa a valer de verdade; não configurar nada
-- mantém o acesso como estava.

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _modulo text,
  _acao text DEFAULT 'editar'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN has_role(_user_id, 'super_admin'::app_role) THEN true
    WHEN EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = _user_id AND up.modulo = _modulo
    ) THEN COALESCE((
      SELECT CASE WHEN _acao = 'editar' THEN up.pode_editar ELSE up.pode_acessar END
      FROM user_permissions up
      WHERE up.user_id = _user_id AND up.modulo = _modulo
    ), false)
    -- Sem linha configurada: mantém o comportamento anterior (só role).
    ELSE has_role(_user_id, 'admin'::app_role)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO anon, authenticated;

-- ============================================
-- RPCs de escrita: trocar o guard de role por permissão de módulo
-- ============================================

-- Pacientes e médicos pertencem ao módulo 'usuarios'.
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
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
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

CREATE OR REPLACE FUNCTION public.admin_update_medico(
  p_id uuid,
  p_email text,
  p_telefone text,
  p_crm text,
  p_uf_crm text,
  p_cpf text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
  END IF;

  UPDATE medicos
  SET
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    crm = COALESCE(p_crm, crm),
    uf_crm = COALESCE(p_uf_crm, uf_crm),
    cpf = COALESCE(p_cpf, cpf),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING user_id INTO v_user_id;

  IF p_telefone IS NOT NULL AND v_user_id IS NOT NULL THEN
    UPDATE profiles SET telefone = p_telefone WHERE id = v_user_id;
  END IF;
END;
$function$;

-- Observações administrativas e registro de ausência: mesmo módulo.
CREATE OR REPLACE FUNCTION public.admin_update_paciente_observacoes(
  p_id uuid,
  p_observacoes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
  END IF;

  UPDATE pacientes
  SET observacoes_admin = p_observacoes, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_medico_observacoes(
  p_id uuid,
  p_observacoes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
  END IF;

  UPDATE medicos
  SET observacoes_admin = p_observacoes, updated_at = NOW()
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_register_medico_ausencia(
  p_medico_id uuid,
  p_consulta_id uuid DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'usuarios', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar usuários.';
  END IF;

  IF p_consulta_id IS NOT NULL THEN
    UPDATE consultas
    SET status = 'cancelada',
        cancelada_por = 'medico',
        motivo_cancelamento = COALESCE(p_motivo, motivo_cancelamento, 'Médico não compareceu'),
        cancelada_em = NOW(),
        updated_at = NOW()
    WHERE id = p_consulta_id AND medico_id = p_medico_id;
    -- Trigger trg_consulta_medico_ausencia incrementa contador automaticamente
  ELSE
    UPDATE medicos
    SET total_ausencias = total_ausencias + 1,
        updated_at = NOW()
    WHERE id = p_medico_id;
  END IF;
END;
$function$;

-- Produtos: ativar / inativar pertencem ao módulo 'produtos'.
CREATE OR REPLACE FUNCTION public.ativar_produto(p_produto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_produto public.produtos;
BEGIN
  IF NOT has_permission(auth.uid(), 'produtos', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar produtos.';
  END IF;

  SELECT * INTO v_produto FROM public.produtos WHERE id = p_produto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado.';
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

CREATE OR REPLACE FUNCTION public.inativar_produto(p_produto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_permission(auth.uid(), 'produtos', 'editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para editar produtos.';
  END IF;

  UPDATE public.produtos
  SET status = 'inativo'::status_generico
  WHERE id = p_produto_id;
END;
$function$;

-- ============================================
-- Nota sobre RLS de profiles
-- ============================================
-- Não é adicionada policy de UPDATE em profiles para admins: hoje a tabela só
-- permite auto-edição (auth.uid() = id) e toda escrita administrativa passa
-- pelas RPCs SECURITY DEFINER acima, que já verificam has_permission. Criar uma
-- policy de UPDATE aqui abriria acesso direto à tabela que antes não existia —
-- seria ampliar a superfície, não fechá-la.
