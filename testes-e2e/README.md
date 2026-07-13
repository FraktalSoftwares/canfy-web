# Testes E2E — Canfy (Paciente, Médico, Admin, Landing)

Roteiros de UAT e automação end-to-end cobrindo os 4 ambientes do produto, todos sobre o mesmo backend Supabase (`agqqxxfrnpuriwrmwdrq`).

## Escopo

- 🖥️ **Landing/Blog** — `canfy-web` rotas públicas
- 🖥️ **Admin web** — `canfy-web` rotas protegidas (back-office)
- 📱 **Paciente mobile** — `canfy-mobile` rotas `/patient/*`
- 📱 **Médico mobile** — `canfy-mobile` rotas `/home`, `/appointment/*`, `/professional-validation/*`, `/financial/*`

## Como os testes são executados

| Ambiente | Mecanismo | Onde |
|---|---|---|
| Landing + Admin web | **Playwright MCP** (DOM real) | `npm run dev` em `canfy-web/` |
| Paciente/Médico mobile | **Playwright MCP** contra `flutter run -d web-server` | `flutter run -d web-server --web-port=<porta>` em `canfy-mobile/` |
| Backend | **Supabase MCP** (`execute_sql`/`list_tables`, somente leitura) para conferir efeito de cada ação | — |

**Descoberta do piloto:** o Flutter web renderiza via CanvasKit (sem DOM de widgets), mas expõe uma camada de **semântica de acessibilidade** que, uma vez ativada, o Playwright consegue ler e dirigir normalmente (roles, textboxes, botões). Não foi necessário `integration_test`/`flutter drive` — que além disso exigiria `chromedriver` (não disponível neste ambiente) e suporte desktop configurado no projeto (ausente). **Playwright é o mecanismo único** para os três ambientes web.

### Receita para dirigir o Flutter web via Playwright

1. `flutter run -d web-server --web-port=<porta> --web-hostname=localhost` em `canfy-mobile/`.
2. Navegar com `browser_navigate` para `http://localhost:<porta>/<rota>` (rotas conhecidas: `/login`, `/register?type=patient`, `/user-selection`, etc. — ver `lib/core/router/app_router.dart`).
3. **Ativar a semântica** a cada carregamento/reload de página — o snapshot inicial só mostra um botão "Enable accessibility"; sem isso, nenhum widget aparece:
   ```js
   () => { const el = document.querySelector('flt-semantics-placeholder'); if (el) { el.click(); return 'clicked'; } return 'not found'; }
   ```
   (via `browser_evaluate`, já que o botão real fica fora da viewport e `browser_click` pode dar timeout)
4. **Sempre `browser_click` no campo antes de `browser_type`** — digitar sem focar explicitamente primeiro pode não sincronizar com o `TextField` real por trás do canvas (valor fica vazio apesar do snapshot parecer ok). Prefira `slowly: true` em campos com máscara/validação em tempo real.
5. Após qualquer navegação interna do app (troca de rota via `go_router`), os `ref`s do snapshot mudam — sempre tirar um novo `browser_snapshot` antes do próximo passo.
6. Um `screenshot` visual é o desempate quando o snapshot de acessibilidade parecer inconsistente com o que está na tela (ex.: erro de validação "preso" mesmo com campo preenchido).

### Convenção de `Key` nos widgets Flutter

Mesmo usando Playwright (que já localiza por texto/role), mantemos `Key`s nos widgets como seletores estáveis e à prova de tradução/rótulo: `<env>_<tela>_<elemento>`, ex.: `pac_login_email`, `pac_login_senha`, `pac_login_submit`, `pac_cadastro_submit`.

## Arquivos

```
00-preparacao.md       # contas de teste, seeds, sandbox
01-landing-blog.md     # LP-*
02-paciente-mobile.md  # PAC-*
03-medico-mobile.md    # MED-*
04-admin-web.md        # ADM-*
05-fluxos-cross.md     # E2E-* (jornadas ponta-a-ponta entre ambientes)
06-permissoes-rls.md   # SEC-*
07-integracoes.md      # INT-* (Asaas, Melhor Envio, DocuSign)
08-regressao-bugs.md   # REG-* (bugs/riscos já identificados)
```

## Template de caso

```
### <ID> — <título>
- **Ambiente:** Paciente mobile / Médico mobile / Admin web / Landing / Backend
- **Papel/persona:** paciente | médico | admin | super_admin | gestor | visualizador | anônimo
- **Prioridade:** Crítica / Alta / Média
- **Automação:** Playwright | integration_test | manual
- **Pré-condições:** estado necessário (contas, dados, status)
- **Passos:** ações do usuário, numeradas
- **Resultado esperado:** o que deve acontecer (UI + efeito no backend)
- **Verificação backend:** tabela/coluna/status a conferir (Supabase MCP, read-only)
- **Status:** ⬜ pendente / ✅ passou / ❌ falhou / ⚠️ bloqueado
```

## Resumo executivo (atualizado 2026-07-10 — rodada de correções)

Executadas quatro rodadas: duas de levantamento (testes reais nos 4 ambientes) e duas de **correção + revalidação**. Das falhas críticas/altas encontradas, **9 foram corrigidas e confirmadas** (código + migrations + deploy de edge functions + rotação de secret pelo usuário), e mais 3 bugs menores novos surgiram ao destravar os fluxos antes bloqueados (ainda pendentes):

| ID | Bug | Severidade | Status |
|---|---|---|---|
| **REG-08** | CORS em `asaas-sync-customer`/`asaas-create-payment` | Crítica | ✅ Corrigido e validado |
| **REG-09** | Valor da consulta hardcoded em 9 pontos (não só 2), incluindo o valor real de cobrança | Alta | ✅ Corrigido — RPC `get_valor_consulta_padrao()` + fix em todas as telas |
| **REG-11** | Upload de documentos quebrado no Flutter web (`PlatformFile.path`) | Crítica | ✅ Corrigido e validado ao vivo (upload real de 5 documentos) |
| **REG-12** | RLS de `pacientes`/`profiles` não reconhece médicos | Crítica | ✅ Corrigido e validado ao vivo (2 médicos, 2 consultas) |
| **REG-13** | Storage sem policy para `pedido_anvisa` | Crítica | ✅ Corrigido (policy); UI do botão de upload ainda pendente |
| **REG-14** | App mobile sem tela de notificações | Alta | ⬜ Não corrigido — feature incompleta, decisão de produto pendente |
| **REG-15** | Compartilhar produto usa link hardcoded | Média | ✅ Corrigido |
| **REG-17** | Médico recusado nunca é informado | Alta | ✅ Corrigido e validado |
| **REG-18** | CORS em `delete-user-account` deixa registro órfão | Crítica | ✅ Corrigido |
| **REG-19** | `ASAAS_API_KEY` inválida/incompatível — bloqueava todo pagamento | Crítica | ✅ Corrigido — usuário rotacionou a chave; PIX real gerado e confirmado |
| **REG-20** *(novo)* | Chat da consulta falha silenciosamente em consulta com data retroativa | Média | ⬜ Não corrigido — causa raiz não identificada com certeza |
| **REG-21** *(novo)* | Listas de consultas do médico não atualizam após finalizar atendimento | Baixa | ⬜ Não corrigido — falta refetch/atualização otimista |
| **REG-22** *(novo)* | `/home` (médico) acessível por paciente sem guarda de papel | Baixa | ⬜ Não corrigido — mesmo padrão do SEC-08, sem vazamento de dado |
| **REG-23** | RLS de `paciente_anamnese` sem policy para o paciente dono — perdia histórico de saúde silenciosamente | Média | ✅ Corrigido e validado |
| **REG-24** *(novo)* | Upload `.path` quebrado em mais 3 telas (novo pedido etapa 3, editar documento médico, editar foto de perfil) | Crítica/Média | ✅ Corrigido e validado |

Com REG-08, REG-12, REG-19, REG-23 e REG-24 corrigidos, **as duas jornadas ponta-a-ponta do produto foram fechadas e validadas nesta sessão pela primeira vez**:
- **E2E-01 (jornada clínica):** PAC-15/16/17 (agendar consulta + fila + pagamento PIX real confirmado) → MED-06 a MED-12 (fila → assumir → atendimento ao vivo → chat → emitir receita → finalizar) → receita ativa confirmada visível ao paciente. Restando pendente apenas o bug pontual de chat em consulta retroativa (REG-20, não reproduziu em consulta com data atual).
- **E2E-02 (jornada comercial):** seleção de receita ativa → upload dos 5 documentos obrigatórios (RG/CNH, comprovante, Anvisa, complementar, laudo — todos persistidos em Storage) → endereço → cotação de frete real via Melhor Envio (5 opções retornadas, sandbox) → PIX gerado via Asaas → pedido criado em `pedidos`/`pedido_itens`. Não testado até o fim: confirmação de pagamento (compensação PIX não ocorre sozinha em sandbox) e assinatura real via DocuSign (requer OAuth fora desta sessão) — ambos fora do que dá para automatizar razoavelmente.

Detalhes completos, evidências e fixes aplicados em `08-regressao-bugs.md` (REG-01 a REG-24).

## Matriz de rastreabilidade

| ID | Título | Status |
|---|---|---|
| LP-01..05 | Landing/blog completo | ✅ |
| PAC-01/02 | Cadastro paciente (fluxo real) | ✅ |
| PAC-04 | Login paciente | ✅ |
| PAC-06 | Dados básicos da conta | ✅ |
| PAC-07 | Status ANVISA | ❌ (REG-06, tela mockada) |
| PAC-08 | Preferências de notificação | ✅ (⚠️ REG-07, erro 409 cosmético) |
| PAC-09 | Canfy ID | ✅ |
| PAC-11 | Login inválido (negativo) | ⬜ |
| PAC-13 | Catálogo + detalhe produto | ✅ |
| PAC-15/16 | Agendar consulta + fila | ✅ (destravado após fix do REG-08/12) |
| PAC-17 | Pagamento de consulta | ✅ corrigido e validado (REG-19 — PIX real gerado, `asaas_customer_id` confirmado) |
| PAC-18 | Chat da consulta (paciente) | ⬜ ainda não testado ponta-a-ponta com a consulta paga mais recente |
| PAC-19 (anamnese) | Histórico de saúde salvo na nova consulta | ✅ corrigido e validado (REG-23 — RLS faltando) |
| PAC-28/30/31/32 | Novo pedido: receita → docs → frete → pagamento | ✅ corrigido e validado até o pagamento PIX gerado (REG-24 — upload `.path`); pedido criado em `pedidos`/`pedido_itens` |
| PAC-26/27 | Histórico consultas/receitas vazio | ✅ |
| MED-01/02 | Cadastro médico + dados profissionais | ✅ |
| MED-02 (docs) | Upload de documentos | ✅ corrigido e validado (REG-11) |
| MED-04 | Login médico aprovado | ✅ |
| MED-05 | Login médico recusado | ✅ corrigido e validado (REG-17) |
| MED-06/07 | Fila + assumir consulta | ✅ |
| MED-08 | Pré-consulta / prontuário / atendimento ao vivo | ✅ corrigido e validado (REG-12) |
| MED-09 | Chat em tempo real (médico) | ⚠️ parcial — funcionou numa consulta, falhou silenciosamente noutra (REG-20) |
| MED-11 | Emitir receita | ✅ |
| MED-12 | Finalizar atendimento | ✅ (⚠️ REG-21, listas não atualizam sem reload) |
| MED-14/15 | Financeiro + Agenda | ✅ |
| ADM-01/04 | Login admin + Dashboard | ✅ |
| ADM-05/07/09/10 | Listar pacientes/médicos/associações/receitas | ✅ |
| ADM-06 | Aprovar médico | ✅ |
| ADM-08 | Criar produto | ✅ |
| ADM-11 | Aprovar pedido | ✅ |
| ADM-13 | Autorização ANVISA no pedido | ❌ (REG-13) |
| ADM-15/16 | Atualizar entrega + histórico | ✅ |
| ADM-17/18 | Inbox + notificação personalizada | ✅ (⚠️ REG-14 no lado mobile) |
| ADM-19 | Acessos: permissões de usuário | ✅ |
| ADM-20 | Configurações do sistema | ✅ (expõe REG-09) |
| ADM-21 | Blog admin | ✅ |
| ADM-22 | Feedbacks de consultas | ✅ |
| ADM-06 (recusa) | Recusar médico | ✅ (expõe REG-17) |
| ADM-12 | Recusar pedido | ⬜ (sem dado de seed disponível) |
| PAC-05 | Recuperação de senha | ✅ |
| PAC-14 | Compartilhar produto | ✅ corrigido (REG-15) |
| PAC-10 | Excluir conta | ✅ corrigido (REG-18) |
| E2E-03 | Onboarding médico (mobile→admin→mobile) | ✅ |
| E2E-05 | Catálogo (admin→paciente+médico) | ✅ |
| E2E-04 | Broadcast de notificação | ⚠️ parcial (REG-14) |
| E2E-01 | Jornada clínica completa | ✅ fechado de ponta a ponta (pagamento→fila→atendimento→chat→receita→visível ao paciente) |
| E2E-02 | Jornada comercial completa | ✅ fechado até o pagamento PIX gerado + frete cotado (REG-24 corrigido); compensação PIX e assinatura DocuSign não exercitadas (fora de escopo de automação) |
| SEC-01 | Paciente só lê os próprios dados | ✅ confirmado (via `pg_policies`) |
| SEC-03 | Médico lê `pacientes` | ✅ corrigido e validado (REG-12) |
| SEC-04 | Catálogo só produtos ativos | ✅ confirmado (via `pg_policies`) |
| SEC-06 | Rotas sem gate de papel na SPA (web) | ✅ confirmado (comportamento esperado) |
| SEC-08 | Deep-link cross-papel no mobile | ❌ confirmado — sem guarda de rota (sem vazamento de dado observado); reincidente em REG-22 (`/home`) |
| SEC-09 | Storage sem policy `pedido_anvisa` | ✅ corrigido e validado (REG-13) |
| INT-08 | Config sandbox Asaas | ✅ |
| INT-04/05/06 | Asaas payments | ✅ corrigido e validado (REG-19 — PIX real criado em sandbox) |

Detalhe completo de cada caso nos arquivos por ambiente (`01`–`07`). Achados de bug consolidados em `08-regressao-bugs.md` (REG-01 a REG-23).

## Ordem de execução recomendada

1. Setup do harness (Playwright MCP no `.mcp.json`) — feito e validado.
2. Preparação de dados/contas (`00-preparacao.md`) — contas de teste paciente+admin e médico (aprovado e recusado) já criadas/documentadas.
3. **Piloto** (feito): 1 fluxo web admin + 1 fluxo mobile — ambos passaram, harness validado.
4. **Rodada ampla** (feita, 2 sessões): inventário substancial por ambiente, ver matriz acima.
5. **Rodada de correções** (feita, 2026-07-10): REG-08, REG-09, REG-11, REG-12, REG-13 (policy), REG-15, REG-17, REG-18 corrigidos, deployados e revalidados ao vivo. Ao destravar REG-08/REG-12, PAC-15/16 e MED-06 a MED-12 (fila → assumir → atendimento ao vivo → chat → receita → finalizar) foram executados pela primeira vez — ver matriz. Descobertos REG-19 (API key Asaas inválida), REG-20 (chat silencioso em consulta retroativa), REG-21 (listas sem refresh pós-finalização) e REG-22 (rota `/home` sem guarda de papel).
6. **Rodada de rotação de secret + descoberta adicional** (feita, 2026-07-10): usuário rotacionou `ASAAS_API_KEY` duas vezes; segunda rotação resolveu REG-19 — pagamento PIX real confirmado (200, `asaas_customer_id` e `asaas_payment_id` reais, persistidos no banco). No caminho, encontrado e corrigido REG-23 (RLS de `paciente_anamnese` sem policy de dono).
7. **Rodada de fechamento E2E-01/E2E-02** (feita, 2026-07-10): E2E-01 fechado de ponta a ponta (chat confirmado funcionando, receita emitida e visível ao paciente). Ao avançar para E2E-02, encontrado e corrigido REG-24 (mesmo padrão do REG-11 — upload `.path` quebrado — reaparecendo em `new_order_step3_page.dart` e `basic_data_page.dart`); após o fix, E2E-02 avançou até cotação de frete real (Melhor Envio) e PIX gerado (Asaas), com pedido confirmado em `pedidos`/`pedido_itens`.
8. **Pendente:** exercitar a compensação real de um PIX em sandbox (requer confirmação manual no painel Asaas ou webhook simulado) e a assinatura real via DocuSign (requer OAuth fora desta sessão) para fechar 100% do E2E-02.
9. Casos ainda não tocados: PAC-03/12/20-25/33-36 (validação de telefone, race de cadastro, mensagens automáticas do sistema, acompanhamento de entrega pós-pagamento), MED-13/16, ADM-02/03/14, SEC-02/05/07, INT-01/02/03/07.
10. Investigar separadamente: REG-20 (causa raiz do chat silencioso em consulta retroativa — não reproduziu em consulta nova), REG-21 (refresh de listas), REG-22 (guarda de rota), REG-13 parte 1 (controle de upload sem label/botão visível no modal Anvisa do admin), e o item de escopo maior identificado no REG-24 (crop/ajuste de imagem em `step1_professional_data_page.dart:441` ainda usa `File(pickedFile.path)`, não corrigido).
