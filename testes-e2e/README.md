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
| Landing + Admin web | **Playwright MCP** (dirigido interativamente, DOM real) | `npm run dev` em `canfy-web/` (porta 8080) |
| Paciente/Médico mobile | **`integration_test`** (Flutter, `flutter test ... -d chrome`) escrito sob demanda, tela a tela | `canfy-mobile/integration_test/` |
| Backend | **Supabase MCP** (`execute_sql`/`list_tables`, somente leitura) para conferir efeito de cada ação | — |

Flutter web usa CanvasKit (renderiza em `<canvas>`, sem DOM de widgets) — por isso não é dirigido via Playwright. Cada fluxo mobile ganha `Key`s nos widgets (convenção abaixo) e um teste `integration_test` dedicado.

### Convenção de `Key` nos widgets Flutter

`<env>_<tela>_<elemento>`, ex.: `pac_login_email`, `pac_login_senha`, `pac_login_submit`, `med_fila_assumir_btn`.

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

## Matriz de rastreabilidade

| ID | Título | Automação | Status |
|---|---|---|---|
| PAC-04 | Login paciente → /patient/home | integration_test | ⬜ |

*(preencher conforme os casos forem escritos/executados)*

## Ordem de execução recomendada

1. Setup do harness (Playwright MCP no `.mcp.json` + `integration_test` no `pubspec.yaml`) — feito.
2. Preparação de dados/contas (`00-preparacao.md`).
3. **Piloto:** 1 fluxo web (Playwright) + 1 fluxo mobile (integration_test) para validar o pipeline.
4. Expandir para o inventário completo por ambiente.
5. Fluxos cross-ambiente (E2E-\*) e permissões (SEC-\*).
