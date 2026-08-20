-- QA (continuação do item de permissões): as demais RPCs de escrita.
--
-- A migração 20260819120200 fechou as RPCs que o QA exercitou diretamente
-- (edição de paciente/médico, observações, ausência, ativar/inativar produto).
-- O teste E2E mostrou que sobravam outras ações de escrita ainda autorizadas
-- só por role — "Inativar conta", "Salvar anamnese", aprovação de pedido,
-- edição de associações etc. — pelas quais um usuário sem `pode_editar` ainda
-- conseguiria alterar dados.
--
-- Em vez de reescrever 20 corpos de função à mão (arriscado e ruidoso), este
-- bloco lê a definição atual de cada função e substitui **apenas** a condição
-- do guard e a mensagem de erro, mantendo o restante do corpo intacto:
--
--   IF NOT (has_role(uid,'super_admin') OR has_role(uid,'admin')) THEN
--     RAISE EXCEPTION 'not authorized';
--
--   -->
--
--   IF NOT has_permission(uid, '<modulo>', 'editar') THEN
--     RAISE EXCEPTION 'Você não tem permissão para editar <rótulo>.';
--
-- Funções do blog não entram: 'blog' não é um dos cinco módulos de
-- user_permissions, então continuam autorizadas por role.

DO $migracao$
DECLARE
  v_alvo RECORD;
  v_def TEXT;
  v_novo TEXT;
  v_modulo TEXT;
  v_rotulo TEXT;
  v_atualizadas INT := 0;
BEGIN
  FOR v_alvo IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        -- módulo 'usuarios'
        'admin_aprovar_medico', 'admin_inativar_medico', 'admin_inativar_paciente',
        'admin_reset_medico_ausencias', 'admin_upsert_paciente_anamnese',
        'admin_upsert_paciente_documento', 'admin_upsert_medico_documento',
        'admin_delete_medico_documento', 'admin_delete_paciente_documento',
        -- módulo 'receitas' (receitas e pedidos)
        'admin_aprovar_pedido', 'admin_update_pedido_anvisa', 'admin_update_pedido_entrega',
        -- módulo 'associacoes'
        'admin_create_associacao', 'admin_update_associacao', 'admin_inativar_associacao',
        -- módulo 'acessos' (configurações do sistema)
        'admin_update_configuracoes_sistema'
      )
  LOOP
    v_def := v_alvo.def;

    v_modulo := CASE
      WHEN v_alvo.proname IN ('admin_aprovar_pedido', 'admin_update_pedido_anvisa',
                              'admin_update_pedido_entrega') THEN 'receitas'
      WHEN v_alvo.proname IN ('admin_create_associacao', 'admin_update_associacao',
                              'admin_inativar_associacao') THEN 'associacoes'
      WHEN v_alvo.proname = 'admin_update_configuracoes_sistema' THEN 'acessos'
      ELSE 'usuarios'
    END;

    v_rotulo := CASE v_modulo
      WHEN 'receitas' THEN 'receitas e pedidos'
      WHEN 'associacoes' THEN 'associações e marcas'
      WHEN 'acessos' THEN 'configurações do sistema'
      ELSE 'usuários'
    END;

    -- 1) condição do guard
    v_novo := regexp_replace(
      v_def,
      '\(\s*(public\.)?has_role\(auth\.uid\(\),\s*''super_admin''(::app_role)?\)\s*OR\s*(public\.)?has_role\(auth\.uid\(\),\s*''admin''(::app_role)?\)\s*\)',
      'has_permission(auth.uid(), ''' || v_modulo || ''', ''editar'')',
      'g'
    );

    -- 1b) variante do guard usada por admin_update_configuracoes_sistema:
    --     NOT has_role(...,'admin') AND NOT has_role(...,'super_admin')
    v_novo := regexp_replace(
      v_novo,
      'NOT\s+(public\.)?has_role\(auth\.uid\(\),\s*''admin''(::app_role)?\)\s*AND\s*NOT\s+(public\.)?has_role\(auth\.uid\(\),\s*''super_admin''(::app_role)?\)',
      'NOT has_permission(auth.uid(), ''' || v_modulo || ''', ''editar'')',
      'g'
    );

    -- 2) mensagem de erro em PT-BR (o front repassa mensagens P0001)
    v_novo := replace(
      v_novo,
      'RAISE EXCEPTION ''not authorized''',
      'RAISE EXCEPTION ''Você não tem permissão para editar ' || v_rotulo || '.'''
    );
    v_novo := replace(
      v_novo,
      'RAISE EXCEPTION ''permission denied''',
      'RAISE EXCEPTION ''Você não tem permissão para editar ' || v_rotulo || '.'''
    );

    IF v_novo IS DISTINCT FROM v_def THEN
      EXECUTE v_novo;
      v_atualizadas := v_atualizadas + 1;
    ELSE
      RAISE NOTICE 'guard não encontrado em %, mantida como estava', v_alvo.proname;
    END IF;
  END LOOP;

  RAISE NOTICE 'RPCs atualizadas: %', v_atualizadas;
END;
$migracao$;
