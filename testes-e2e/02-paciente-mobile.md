# Paciente Mobile (PAC-*)

## Auth & conta

### PAC-01/02 — Cadastro de paciente (fluxo real) → /patient/home
- **Ambiente:** Paciente mobile
- **Papel/persona:** anônimo → paciente
- **Prioridade:** Crítica
- **Automação:** Playwright MCP contra `flutter run -d web-server`
- **Passos:**
  1. `/user-selection` → ativar accessibility → clicar "Usar como paciente"
  2. Preencher nome, data de nascimento, sexo, e-mail, senha, confirmar senha (todas com `click()` antes de `type()`)
  3. Marcar os dois checkboxes (termos + compartilhamento de dados)
  4. Clicar "Criar conta"
- **Resultado esperado:** redireciona para `/patient/home` com "Boas Vindas, `<nome>`!"
- **Verificação backend:** `profiles.tipo_usuario='paciente'` + linha correspondente em `pacientes` com a `data_nascimento` informada
- **Status:** ✅ passou — 2026-07-10, conta `teste.e2e.paciente@canfy-test.local` criada e confirmada via Supabase MCP

### PAC-04 — Login do paciente → /patient/home
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Crítica
- **Automação:** Playwright MCP (rota dedicada `/login`)
- **Passos:** `/login` → ativar accessibility → clicar campo e-mail, digitar → clicar campo senha, digitar → "Entrar"
- **Resultado esperado:** redireciona para `/patient/home`
- **Status:** ✅ passou — 2026-07-10

> **Nota de descoberta:** a tela `/register` tem uma aba interna "Login" redundante com a `LoginPage` real em `/login`. A digitação não sincronizou corretamente nessa aba interna (possível fragilidade de automação, não confirmado como bug do app). Preferir `/login` para os casos automatizados.

### PAC-06 — Editar dados básicos / ver conta
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Alta
- **Automação:** Playwright MCP
- **Passos:** `/patient/account` → "Dados básicos"
- **Resultado esperado:** exibe nome, e-mail, senha mascarada, CPF, sexo, data de nascimento (todos batendo com o cadastro); campos de nome da mãe/SUS/telefone/região vazios (não coletados no cadastro rápido); links "Alterar senha" e "Excluir conta"
- **Status:** ✅ passou — 2026-07-10

### PAC-07 — Ver status ANVISA
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Passos:** `/patient/account/anvisa`
- **Resultado esperado (conforme especificação):** status real da autorização (em análise/aprovado/recusado) vindo da API/dados do paciente
- **Resultado observado:** tela sempre mostra "Última solicitação 15/11/2024" e "Status: Aprovado" — **mesmo para uma conta nova que nunca solicitou nada**
- **Verificação backend:** não há coluna de status ANVISA vinculada a este paciente sendo lida; inspeção do código (`lib/pages/patient/account/anvisa_page.dart`) confirma que o conteúdo é **estático (hardcoded)**, não busca dado do Supabase
- **Status:** ❌ **falhou** — tela mockada, não reflete dado real. Ver `08-regressao-bugs.md` REG-06.

### PAC-08 — Preferências de notificação
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Passos:** `/patient/account/settings` → alternar switch "Alertas por SMS"
- **Resultado esperado:** switch muda de estado e persiste em `preferencias_notificacoes`
- **Resultado observado:** switch mudou visualmente e `preferencias_notificacoes.notif_sms` foi atualizado para `false` no banco (confirmado, `updated_at` bate com o horário do clique) — **porém o console registrou um erro 409 Conflict** na chamada REST a `preferencias_notificacoes`, sugerindo um insert que falha por conflito de chave antes de um update/upsert que dá certo
- **Verificação backend:** `preferencias_notificacoes.notif_sms=false`, `updated_at` atualizado — confirmado
- **Status:** ✅ passou funcionalmente / ⚠️ achado de qualidade (ruído de erro 409 no console). Ver REG-07.

### PAC-09 — Gerar Canfy ID
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Passos:** `/patient/account/canfy-id`
- **Resultado esperado:** cartão com nome, CPF, data de nascimento reais + QR code; campos sem dado disponível (ANVISA, registro) mostram "--"
- **Status:** ✅ passou — 2026-07-10 (dinâmico, contrasta com a tela ANVISA mockada — reforça que PAC-07 é bug real)

## Catálogo

### PAC-13 — Navegar catálogo e ver detalhe do produto
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Alta
- **Automação:** Playwright MCP
- **Passos:** `/patient/catalog` → clicar "ver mais" em um produto
- **Resultado esperado:** lista todos os produtos ativos; detalhe abre com o `id` do produto na URL
- **Verificação backend:** produto criado em ADM-08 (`Óleo Teste E2E CBD 10mg/ml`) apareceu na listagem e abriu corretamente — **confirma E2E-05** (admin cadastra → paciente vê no catálogo)
- **Status:** ✅ passou — 2026-07-10

### PAC-11 — (neg.) Login com credenciais inválidas
- **Ambiente:** Paciente mobile
- **Prioridade:** Alta
- **Automação:** Playwright MCP (a executar)
- **Status:** ⬜ pendente

### PAC-14 — Compartilhar produto
- **Ambiente:** Paciente mobile
- **Automação:** Playwright MCP
- **Passos:** abrir produto no catálogo → ícone de compartilhar (canto superior direito) → modal "Compartilhar produto"
- **Resultado esperado:** modal com opções (Email, WhatsApp, Instagram, Facebook, X) e link do produto
- **Resultado observado:** modal abre corretamente com todas as opções, **mas o link exibido/copiado é sempre o mesmo, fixo** (`https://canfy.com/produto/oleo-canabidiol-20mg`), independente do produto realmente aberto — testado com "Óleo Teste E2E CBD 10mg/ml" e o link não referenciava esse produto
- **Status:** ⚠️ passou parcialmente — UI funciona, mas o link é hardcoded. Ver REG-15.

### PAC-05 — Recuperação de senha
- **Ambiente:** Paciente mobile
- **Automação:** Playwright MCP
- **Passos:** `/forgot-password` → preencher e-mail → "Enviar link de recuperação"
- **Resultado esperado:** navega para `/forgot-password/email-sent`
- **Resultado observado:** com e-mail de domínio `.local` (conta de teste), a API do Supabase rejeitou com 400 (`email_address_invalid` — limitação do domínio de teste, não bug) e a tela não deu feedback nenhum. **Repeti com um e-mail de domínio válido (`@gmail.com`, não cadastrado)** e o fluxo funcionou perfeitamente, navegando para a tela de confirmação.
- **Status:** ✅ passou (caminho feliz confirmado). Ver REG-16 (observação menor sobre feedback de erro).

### PAC-10 — Excluir conta e todos os dados
- **Ambiente:** Paciente/Médico mobile (testado com o médico de teste "recusado", para não perder a conta principal)
- **Automação:** Playwright MCP
- **Passos:** `/patient/account/basic-data` (ou equivalente do médico) → "Excluir conta e todos os dados na plataforma" → confirmar no modal "Excluir conta permanentemente"
- **Resultado esperado:** conta e todos os dados relacionados removidos da plataforma
- **Resultado observado:** `preferencias_notificacoes` e `profiles` (com cascade para `medicos`) foram **deletados com sucesso**, mas a chamada final à edge function `delete-user-account` (responsável por remover o registro de `auth.users`) **falhou por CORS** — mesmo padrão de bug do REG-08. Resultado: conta órfã, sem perfil mas ainda existente em `auth.users`.
- **Status:** ❌ **falhou** (parcialmente — dados de perfil removidos, auth não). Ver REG-18 (crítico).

---

*(demais casos PAC-03/12/18-25/28-36 — validação de telefone, race de cadastro, chat da consulta, receita/pedido completos — não testados nesta rodada, vários dependem de REG-08 estar corrigido; ver plano em `C:\Users\Keystone\.claude\plans\encima-de-todos-os-partitioned-clarke.md`)*
