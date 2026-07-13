# Preparação — contas, dados, sandbox

## Conta de teste já criada (ambiente de desenvolvimento)

Criada de ponta a ponta pelo fluxo real de cadastro do app (não inserida direto no banco), e depois promovida a admin via `user_roles` para também cobrir os pilotos do admin web:

| Campo | Valor |
|---|---|
| E-mail | `teste.e2e.paciente@canfy-test.local` |
| Senha | `CanfyTeste123!` |
| `profiles.tipo_usuario` | `paciente` |
| `user_roles.role` | `admin` (adicionado depois, via SQL, só nesta conta de teste) |
| `pacientes.data_nascimento` | `1995-01-01` |

Essa conta cobre PAC-\* (fluxo paciente) e ADM-\* (fluxo admin) com um único par de credenciais. Ambiente é de desenvolvimento — sem dados reais de pacientes/clientes.

## Contas de teste adicionais (a criar quando os fluxos exigirem)

| Papel | Onde criar | Observação |
|---|---|---|
| Médico | `/register?type=doctor` no mobile | Precisa ser **aprovado** pelo admin (`admin_aprovar_medico`) antes de testar fluxos de atendimento |
| Gestor / Visualizador | tela "Acessos" (`MinhaConta.tsx`), por um admin | Para casos negativos de permissão (SEC-06/SEC-07) |
| Super admin | `user_roles` com `role='super_admin'` | Só se algum caso exigir distinção admin vs super_admin |

## Seeds reaproveitáveis

- `create-sample-patients` — cria pacientes de exemplo (Ana Clara Silva, João Pedro Almeida, Fernanda Ribeiro, …)
- `seed-database` — popular catálogo (produtos, associações)
- `seed-receitas-pedidos` — popular receitas/pedidos de exemplo

Invocar via Supabase (edge function), não recriar manualmente os dados.

## Sandbox de integrações

- **Asaas**: `canfy-mobile/lib/constants/asaas_config.dart` aponta para `api-sandbox.asaas.com` — confirmar antes de rodar INT-\*/E2E-\* de pagamento.
- **Melhor Envio**: usar ambiente sandbox/homologação da ME.
- **DocuSign**: usar conta de desenvolvedor DocuSign.

Nunca rodar os testes de pagamento/envio contra as APIs de produção.

## Ambientes locais

```bash
# Admin/Landing (canfy-web/)
npm install
npm run dev   # sobe em 8080, ou próxima porta livre (8081/8082...) se já houver instância

# Mobile (canfy-mobile/)
flutter pub get
flutter run -d web-server --web-port=5679 --web-hostname=localhost
# depois: Playwright MCP navega para http://localhost:5679/<rota>
```

## Status do harness

- [x] `.mcp.json` com `playwright` (`@playwright/mcp`) — carregado e validado
- [x] `Key`s adicionadas em `login_page.dart` e `register_page.dart` (convenção `pac_*`)
- [x] Conta de teste criada de ponta a ponta (paciente + admin) — ver acima
- [x] Piloto web admin (Playwright): login → `/home` (Dashboard) — ✅ passou
- [x] Piloto mobile paciente (Playwright): cadastro real → `/patient/home`, depois login → `/patient/home` — ✅ passou
- [x] Decisão: **Playwright é o único mecanismo de automação** (web e mobile). `integration_test`/`flutter drive` foi descartado nesta sessão — exigiria `chromedriver` (ausente) e suporte desktop Flutter (não configurado no projeto). Ver `README.md` para a receita de como dirigir o Flutter web via Playwright (ativação de accessibility, click-before-type).
