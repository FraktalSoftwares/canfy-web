# Admin Web (ADM-*)

### ADM-01 — Login do admin → /home (Dashboard)
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Crítica
- **Automação:** Playwright MCP
- **Pré-condições:** conta com `user_roles.role IN ('admin','super_admin')`
- **Passos:** `/entrar` → preencher e-mail/senha → "Entrar"
- **Resultado esperado:** toast "Login realizado com sucesso!" e redireciona para `/home`, Dashboard com KPIs reais
- **Status:** ✅ passou — 2026-07-10

### ADM-04 — Dashboard KPIs
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Resultado esperado:** cards com Receitas emitidas, Pedidos realizados, Produtos no catálogo, Médicos ativos, Pacientes ativos, Associações/marcas ativas, feedbacks de consultas
- **Verificação backend:** valores batem com `count(*)` das respectivas tabelas (23 pacientes, 19 associações, 6 produtos observados)
- **Status:** ✅ passou — 2026-07-10

### ADM-05 — Pacientes: listar e ver detalhe
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Alta
- **Automação:** Playwright MCP
- **Passos:** `/pacientes` → clicar numa linha
- **Resultado esperado:** tabela lista todos os pacientes (23, paginado 10/página); clique abre `/pacientes/:id` com detalhe
- **Status:** ✅ passou — 2026-07-10 (listar + abrir detalhe; edição/inativação não testadas ainda)

### ADM-06 — Médicos: aprovar / recusar solicitação
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Crítica
- **Automação:** Playwright MCP
- **Passos:** `/medicos` → aba "Solicitações de novos médicos" → clicar no médico de teste próprio (`teste.e2e.medico@canfy-test.local`) → modal → "Aprovar cadastro"
- **Resultado esperado:** solicitação some da lista de pendentes; `medicos.status` muda para `ativo`
- **Verificação backend:** `medicos.status='ativo'` confirmado via SQL — bate com E2E-03 (onboarding do médico)
- **Status:** ✅ passou — 2026-07-10
- **Observação:** o admin permite aprovar mesmo com "Etapa de validação 1 de 3" (documentos não enviados) — o modal não impede a aprovação de um cadastro incompleto. As 3 outras solicitações de seed continuam pendentes, travadas na mesma etapa (ver REG-11 — provável causa raiz comum: upload de documentos quebrado no Flutter web).

### ADM-07 — Médicos: listar
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Resultado esperado:** tabela com 9 médicos ativos/inativos, CRM+UF, especialidade, atendimentos, status
- **Status:** ✅ passou — 2026-07-10

### ADM-08 — Produtos: criar (fluxo completo)
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Crítica
- **Automação:** Playwright MCP
- **Passos:**
  1. `/produtos/novo`
  2. Preencher nome comercial, princípio ativo, forma farmacêutica (dropdown), concentração CBD, fabricante, volume, preço
  3. Dimensões de envio já vêm com defaults (peso/largura/altura/comprimento) — mantidos
  4. Marcar 1 associação/marca vinculada (checkbox)
  5. Clicar "Salvar e publicar produto"
- **Resultado esperado:** volta para `/produtos`, produto novo aparece na listagem com status "Ativo"
- **Verificação backend:** `produtos` novo row com `nome_comercial='Óleo Teste E2E CBD 10mg/ml'`, `status='ativo'`, `preco_brl=99.90`, dimensões corretas — confirmado
- **Status:** ✅ passou — 2026-07-10
- **Achado de qualidade:** a lista de "Associações e marcas vinculadas" no formulário de produto tem **nomes duplicados** (ex.: "VitaCann Medicamentos", "BioCanabis Brasil", "Green Hope Pharma", "Associação Medicinal do Sul" aparecem 2x cada, cada um com checkbox próprio). Indica duplicação real de linhas em `associacoes_marcas` (visível também na tela `/associacoes`, a confirmar) ou um bug de renderização que itera a lista duas vezes — vale investigação (ver REG a criar).

### ADM-09 — Associações/marcas: listar
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Resultado esperado:** lista com nome, tipo, região, status
- **Status:** ✅ passou — 2026-07-10

### ADM-10 — Receitas: consulta read-only
- **Ambiente:** Admin web
- **Papel/persona:** admin
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Resultado esperado:** lista "Receitas e pedidos" com 1 registro (bate com `receitas` tendo 1 row)
- **Status:** ✅ passou — 2026-07-10

## Pedidos

### ADM-11 — Pedidos: aprovar
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** `/pedidos` → pedido "Aprovação pendente" → "Aprovar pedido" → confirmar no modal (observação opcional)
- **Resultado esperado:** status muda para `aprovado`, timeline reflete o novo estágio
- **Verificação backend:** `pedidos.status='aprovado'`, `pedido_historico` registra `pendente→aprovado` com timestamp — confirmado
- **Status:** ✅ passou — 2026-07-10

### ADM-13 — Pedidos: registrar Autorização ANVISA — BLOQUEADO
- **Status:** ❌ **falhou** — ver REG-13. O modal "Autorização Anvisa" não expõe nenhum controle de upload visível (o `<input type=file>` fica com `display:none` sem label/botão associado); mesmo forçando a interação via DevTools e anexando um arquivo válido, o upload falha com 403 "new row violates row-level security policy" — não existe policy de Storage para o prefixo `pedido_anvisa/` no bucket `documents`.

### ADM-15 — Pedidos: atualizar entrega
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** "Atualizar entrega" → selecionar status "Em separação" → "Atualizar" (sem código de rastreio/prazo, ambos opcionais)
- **Resultado esperado:** status do pedido muda
- **Verificação backend:** `pedidos.status` mudou de `aprovado` para `em_separacao` — confirmado
- **Status:** ✅ passou — 2026-07-10

### ADM-16 — Pedidos: histórico/timeline
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Resultado esperado:** `pedido_historico` registra cada transição de status com timestamp real
- **Verificação backend:** confirmado (`status_anterior='pendente'`, `status_novo='aprovado'`, `created_at` bate com o horário do clique)
- **Status:** ✅ passou — 2026-07-10

## Notificações

### ADM-17 — Notificações: caixa de entrada
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Resultado esperado:** abas "Todas"/"Não lidas", filtro por categoria (Financeiras, Gestão de usuários, Gestão de pedidos e receitas, Catálogo, Alertas técnicos, Engajamento, Riscos e segurança, Gerais)
- **Status:** ✅ passou — 2026-07-10

### ADM-18 — Notificações personalizadas: enviar por audiência
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** `/notificacoes/personalizadas` → "Nova notificação" → título, descrição, destinatário "Todos os pacientes", tipo de envio "Envio imediato" → "Salvar notificação"
- **Resultado esperado:** notificação criada, endereçada à audiência escolhida
- **Verificação backend:** `notificacoes` nova row com `destinatario_tipo='todos_pacientes'`, `tipo_envio='imediato'` — confirmado
- **Status:** ✅ passou — 2026-07-10 (criação no backend). **Porém:** ver REG-14 — o app mobile não tem nenhuma tela/rota de notificações para o paciente efetivamente ver essa mensagem in-app; a feature está incompleta do lado do consumidor.

## Acessos, configuração, conteúdo

### ADM-19 — Acessos: listar usuários e gerenciar permissões
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** `/minha-conta` → aba "Acessos" → lista completa de usuários (`admin-list-users`) → clicar num usuário → expandir módulo "Usuários" → marcar "Acessar módulo de usuários" → "Salvar alterações"
- **Resultado esperado:** `user_permissions` atualizado para o usuário selecionado
- **Verificação backend:** `user_permissions` com `modulo='usuarios', pode_acessar=true` para o usuário de teste — confirmado
- **Status:** ✅ passou — 2026-07-10 (lista completa com todos os usuários da plataforma, incluindo o médico de teste recém-criado)

### ADM-20 — Configurações do sistema
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** `/configuracoes-sistema`
- **Resultado esperado:** regras financeiras (comissão médico, valor consulta padrão, taxa pedido, frete internacional), config Melhor Envio (CEP origem, modo sandbox, remetente), feriados bloqueados
- **Verificação backend:** valores da tela batem exatamente com `configuracoes_sistema` (`valor_consulta_padrao=99.90`, `melhor_envio_sandbox=true`, `melhor_envio_cep_origem='65901110'`)
- **Status:** ✅ passou — 2026-07-10
- **Achado crítico derivado:** o valor real configurado (`R$ 99,90`) **diverge do que o app do paciente mostra na tela de nova consulta (`R$ 200,00` hardcoded)** — ver REG-09.

### ADM-21 — Blog admin (CMS)
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Resultado esperado:** lista os posts do blog, refletindo o que aparece na landing pública
- **Status:** ✅ passou — 2026-07-10 (3 posts listados, mesmos vistos em LP-02)

### ADM-22 — Feedbacks de consultas
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Resultado esperado:** total de feedbacks, média geral, notas baixas, filtro por médico/paciente e por faixa de estrelas
- **Status:** ✅ passou — 2026-07-10 (estado vazio correto: 0 feedbacks, bate com `feedbacks_consultas` vazia)

### ADM-06 (recusa) — Médicos: recusar solicitação
- **Ambiente:** Admin web
- **Automação:** Playwright MCP
- **Passos:** solicitação de um segundo médico de teste → "Recusar" → preencher "Motivo da recusa" → "Confirmar recusa"
- **Resultado esperado:** solicitação marcada como recusada com o motivo registrado
- **Verificação backend:** `medicos.status_validacao='recusado'`, `medicos.motivo_recusa` preenchido corretamente — confirmado. **Porém** `medicos.status` (campo usado pelo app para decidir o redirect de login) permanece `pendente_aprovacao` — o médico recusado nunca é informado (ver REG-17, testado do lado mobile em MED-05).
- **Status:** ✅ passou no admin (a ação em si funciona e persiste corretamente) — mas expõe o bug REG-17 do lado do consumidor

### ADM-12 — Pedidos: recusar
- **Status:** ⬜ não testado nesta rodada — os 5 pedidos de seed disponíveis já estavam todos "Em andamento"/aprovados quando cheguei nessa etapa (usei o único "Aprovação pendente" para ADM-11); não sobrou nenhum pedido pendente para testar a recusa sem afetar outros casos.

---

*(ADM-02/03/14 não testados nesta rodada: recuperar/trocar senha do admin, gerar etiqueta Melhor Envio real — próxima leva)*
