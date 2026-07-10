# Paciente Mobile (PAC-*)

## Auth & conta

### PAC-04 — Login do paciente → /patient/home
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Crítica
- **Automação:** `integration_test` → `canfy-mobile/integration_test/pac_04_login_test.dart`
- **Pré-condições:** conta de paciente ativa (`profiles.tipo_usuario='paciente'`), credenciais em `TEST_PATIENT_EMAIL`/`TEST_PATIENT_PASSWORD`
- **Passos:**
  1. Abrir o app (splash) e navegar para `/login`
  2. Preencher e-mail (`pac_login_email`) e senha (`pac_login_senha`)
  3. Tocar em "Entrar" (`pac_login_submit`)
- **Resultado esperado:** redireciona para `/patient/home`
- **Verificação backend:** sessão criada em `auth.users`; `profiles.tipo_usuario='paciente'` confirma o destino da rota
- **Status:** ⬜ pendente (piloto do harness)

### PAC-11 — (neg.) Login com credenciais inválidas
- **Ambiente:** Paciente mobile
- **Papel/persona:** paciente
- **Prioridade:** Alta
- **Automação:** integration_test (a escrever)
- **Pré-condições:** nenhuma
- **Passos:** preencher e-mail/senha inválidos → tocar "Entrar"
- **Resultado esperado:** mensagens de erro "E-mail incorreto"/"Senha incorreta", sem navegação
- **Verificação backend:** nenhuma sessão criada
- **Status:** ⬜ pendente

---

*(demais casos PAC-01/02/03/05...36 do inventário completo a detalhar incrementalmente, conforme cada tela ganha Keys — ver plano em `C:\Users\Keystone\.claude\plans\encima-de-todos-os-partitioned-clarke.md` para a lista completa de IDs previstos)*
