# Preparação — contas, dados, sandbox

## Contas de teste necessárias

| Papel | Onde criar | Observação |
|---|---|---|
| Paciente | `/register?type=patient` no mobile, ou seed `create-sample-patients` | Precisa de e-mail/senha fixos para os testes automatizados |
| Médico | `/register?type=doctor` no mobile | Precisa ser **aprovado** pelo admin (`admin_aprovar_medico`) antes de testar fluxos de atendimento |
| Admin | `user_roles` com `role='admin'` | Criado via SQL direto ou tela "Acessos" por outro admin |
| Super admin | `user_roles` com `role='super_admin'` | Para casos SEC-\* de permissão máxima |
| Gestor / Visualizador | tela "Acessos" (`MinhaConta.tsx`) | Para casos negativos de permissão (SEC-06/SEC-07) |

## Credenciais para os testes automatizados

Não hardcodar em código. Passar via `--dart-define` (Flutter) ou variáveis de ambiente locais (Playwright):

```
TEST_PATIENT_EMAIL / TEST_PATIENT_PASSWORD
TEST_DOCTOR_EMAIL / TEST_DOCTOR_PASSWORD
TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
```

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
npm run dev   # http://localhost:8080

# Mobile (canfy-mobile/)
flutter pub get
flutter run -d chrome                     # execução manual
flutter test integration_test/<arquivo>.dart -d chrome \
  --dart-define=TEST_PATIENT_EMAIL=... \
  --dart-define=TEST_PATIENT_PASSWORD=...
```

## Status do harness

- [x] `.mcp.json` com `playwright` (`@playwright/mcp`) — **requer reiniciar a sessão do Claude Code para carregar**
- [x] `integration_test` como dev_dependency no `canfy-mobile/pubspec.yaml`
- [x] `canfy-mobile/integration_test/` criado com o piloto `pac_04_login_test.dart`
- [ ] Contas de teste reais criadas e credenciais definidas
- [ ] Piloto web (Playwright) executado
- [ ] Piloto mobile (`pac_04_login_test.dart`) executado com sucesso
