# Permissões / RLS / Segurança (SEC-*)

A maior parte dos achados de RLS nesta rodada veio de **efeitos colaterais reais** encontrados ao executar os fluxos funcionais (não de testes de RLS dedicados) — o que reforça sua gravidade: não são casos de borda teóricos, são bugs que qualquer usuário real atinge no caminho feliz.

### SEC-03 — Médico lê `pacientes` — FALHA CONFIRMADA (crítica)
- **Esperado (levantamento original):** "Médico só lê `receitas` que emitiu; lê `pacientes` (regra 'médicos e admins')"
- **Observado:** a policy `"Medicos and Admins can view pacientes"` (`SELECT` em `pacientes`) tem `qual`:
  ```sql
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  ```
  — **não existe nenhuma condição que reconheça um usuário como médico** (ex.: `EXISTS (SELECT 1 FROM medicos WHERE medicos.user_id = auth.uid())`). Um médico autenticado, sem papel admin, **não consegue ler a tabela `pacientes`** apesar do nome da policy dizer o contrário.
- **Impacto observado na prática:** a tela de consulta em tempo real (`live_consultation_page.dart`), que faz `pacientes!inner(...)` na query, retorna 0 linhas para qualquer médico — ver REG-12 e MED-09/10/12.
- **Status:** ❌ **falhou** — não é apenas um caso de borda, é o comportamento **padrão** para todo médico.

### SEC-01/02/04/05 — Não testados diretamente nesta rodada
- SEC-01 (paciente só lê os próprios dados), SEC-02 (paciente não escreve direto em pedidos/receitas), SEC-04 (catálogo só `status=ativo` para qualquer autenticado), SEC-05 (notificações só própria/broadcast) — não foram alvo de teste negativo direto, mas nenhum comportamento observado durante os testes funcionais contradisse essas regras (ex.: meu paciente só via seus próprios dados em `/patient/account`).

### SEC-06 — `ProtectedRoute` valida só sessão, não papel — CONFIRMADO
- **Observado (LP-05):** com sessão válida como admin, consegui navegar livremente por todas as rotas do menu (Pacientes, Médicos, Produtos, Pedidos, etc.) sem nenhum gate de papel na SPA — como já esperado pelo levantamento original.
- **Ação recomendada permanece:** verificar que os RPCs `admin_*` e edge functions rejeitem de fato `gestor`/`visualizador` — não testado nesta rodada (exigiria criar uma conta com esses papéis).

### SEC-09 — Storage — achado adicional (relacionado a REG-13)
- Ao investigar REG-13, mapeei a política completa do bucket `documents`: existem policies de INSERT/UPDATE/DELETE específicas por prefixo de pasta (`medico_docs`, `paciente_docs` só admin; `order_docs` só o dono). **Falta uma policy para `pedido_anvisa/`** (usado pelo modal de Autorização ANVISA do admin) — nem admin consegue gravar ali. Isso é uma lacuna de RLS de Storage, não uma falha de segurança (o efeito é bloquear demais, não vazar dados), mas quebra uma funcionalidade inteira.

### SEC-08 — Deep-link cross-papel no mobile — CONFIRMADO (sem guarda de rota)
- **Observado:** logado como médico puro (`teste.e2e.medico.recusado@canfy-test.local`, sem papel admin), naveguei diretamente para `/patient/home` e `/patient/account/basic-data` (rotas do paciente). **Ambas carregaram normalmente** — sem nenhum redirect/bloqueio — confirmando a suspeita do levantamento original de que não há guarda de rota por papel em `app_router.dart`.
- **Achado positivo:** não houve vazamento de dado de outro usuário — `/patient/home` mostrou estado vazio genérico ("Você ainda não fez pedidos") e `/patient/account/basic-data` mostrou os próprios dados do médico (nome, e-mail), não os de um paciente real. Isso indica que as **queries usam `auth.uid()` corretamente** e o RLS protege o dado mesmo quando a UI "errada" é acessível.
- **Risco residual:** mesmo sem vazamento observado nesta amostra, uma tela de paciente acessível a um médico pode expor fluxos/ações não pensadas para esse papel (ex.: tentar criar um pedido como "paciente" estando logado como médico) — vale mapear se alguma ação de escrita nessas telas depende de uma suposição de papel que a UI não garante.
- **Status:** ❌ confirmado — sem guarda de rota (comportamento igual ao SEC-06 do lado web)
- **Ref.:** login `/professional-validation/status`, depois deep-link para `/patient/*`

### SEC-07 — Não testado
- Exigiria uma conta com papel `gestor`/`visualizador` (só criável via tela "Acessos" por outro admin) — não criada nesta rodada.

---

## Recomendação de prioridade de correção (RLS)

1. **SEC-03 / REG-12** — corrigir a policy `"Medicos and Admins can view pacientes"` para reconhecer médicos de verdade. Este é o bug de RLS de maior impacto: bloqueia toda a jornada de atendimento clínico.
2. **SEC-09 / REG-13** — adicionar policy de Storage para `pedido_anvisa/`.
3. Auditar se outras queries do app médico (prontuário, prescrição, financeiro) fazem o mesmo padrão de `pacientes!inner(...)` direto — as que usam RPC (como `getProntuarioContexto`) parecem já contornar o problema corretamente.
