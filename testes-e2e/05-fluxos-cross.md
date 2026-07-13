# Fluxos cross-ambiente (E2E-*)

### E2E-03 — Onboarding do médico
- **Jornada:** médico se cadastra (mobile) → `pendente_aprovacao` → admin aprova (web) → médico ganha acesso
- **Passos executados:** MED-01/02 (cadastro real, etapa 1) → ADM-06 (aprovação real no admin) → MED-04 (login pós-aprovação)
- **Resultado:** `medicos.status` `pendente_aprovacao → ativo`; login do médico redireciona para `/home` em vez de `/professional-validation/status`
- **Status:** ✅ passou — 2026-07-10, ponta-a-ponta com contas reais

### E2E-05 — Catálogo (admin cadastra produto → aparece no paciente e no médico)
- **Jornada:** admin cadastra produto (web, ADM-08) → paciente vê no catálogo (mobile, PAC-13) → médico também vê no catálogo (mobile, MED home)
- **Resultado:** produto `Óleo Teste E2E CBD 10mg/ml` criado no admin apareceu na listagem do catálogo do paciente e no catálogo exibido na home do médico, com o mesmo `id`
- **Status:** ✅ passou — 2026-07-10, confirmado nos dois lados (paciente e médico)

### E2E-04 — Broadcast de notificação
- **Jornada:** admin envia notificação personalizada (web, ADM-18) → paciente recebe in-app
- **Resultado:** notificação criada corretamente no backend (`notificacoes`, `destinatario_tipo='todos_pacientes'`), mas **o app mobile não tem nenhuma tela de notificações** para o paciente consumi-la
- **Status:** ⚠️ **parcial** — metade do fluxo (admin → backend) funciona; a outra metade (backend → UI mobile) não existe. Ver REG-14.

### E2E-01 — Jornada clínica completa — BLOQUEADA
- **Jornada:** paciente agenda consulta (mobile) → paga (Asaas) → médico assume da fila → atende no chat → emite receita → paciente vê receita ativa
- **O que consegui testar:** agendamento de consulta até a etapa de pagamento (PAC-15/16); fila e "assumir consulta" do lado do médico usando uma consulta de **seed** já existente (já que meu próprio agendamento não completou por causa do bug de pagamento)
- **Bloqueios encontrados nesta jornada:**
  - **REG-08** — pagamento da consulta (Asaas/PIX) falha por CORS em `asaas-sync-customer`, então nenhum paciente real consegue criar uma consulta paga
  - **REG-12** — mesmo usando uma consulta de seed já paga/agendada, o médico não consegue abrir a tela de atendimento ao vivo (RLS de `pacientes` bloqueia médicos de verdade)
- **Status:** ❌ **bloqueada em dois pontos diferentes** — a jornada não pode ser completada ponta-a-ponta no estado atual do código

### E2E-02 — Jornada comercial completa — parcialmente testada
- **Jornada:** paciente cria pedido a partir da receita → procuração DocuSign → cotação ME → pagamento Asaas → admin aprova → registra ANVISA → gera etiqueta ME → webhook ME atualiza status → paciente acompanha em tempo real
- **O que consegui testar:** a partir de um pedido de **seed** já existente (criado antes desta sessão, portanto sem depender do Asaas quebrado): ADM-11 (aprovar), ADM-15 (atualizar entrega manualmente para "em_separação")
- **Bloqueios:**
  - Não testei a criação de um pedido novo pelo paciente (dependeria do fluxo de consulta/receita, que está bloqueado por REG-08, e o pedido também usa Asaas para pagamento)
  - **REG-13** bloqueia o registro de Autorização ANVISA (ADM-13)
  - Não testei a geração real de etiqueta Melhor Envio (ADM-14) nem o webhook (INT-03) nesta rodada
- **Status:** ⚠️ **parcial** — a metade "admin processa pedido existente" funciona; a ponta "paciente cria pedido do zero" está bloqueada pelos mesmos problemas de pagamento

### E2E-06 — Recusa de pedido
- **Status:** ⬜ não testado nesta rodada (testei aprovar, não recusar, para não gastar os poucos pedidos de seed disponíveis)

### E2E-07 — Confirmação de pagamento assíncrona (webhook Asaas)
- **Status:** ⬜ não testado — depende de disparar o webhook real do Asaas, e o fluxo de criação de pagamento já está bloqueado por REG-08

---

## Resumo de bloqueios cross-ambiente

| Jornada | Bloqueio | REG |
|---|---|---|
| Paciente paga consulta/pedido | CORS em `asaas-sync-customer` | REG-08 |
| Médico atende consulta ao vivo | RLS de `pacientes` não reconhece médicos | REG-12 |
| Admin registra Autorização ANVISA no pedido | Sem controle de upload + sem policy de Storage | REG-13 |
| Médico completa validação profissional | Upload de documentos quebrado no Flutter web | REG-11 |
| Paciente/médico veem notificação in-app | Tela de notificações não existe no mobile | REG-14 |

Esses 5 bugs, juntos, impedem que **qualquer jornada de ponta a ponta envolvendo pagamento ou upload de documento** seja completada usando o app real (mobile web). As verificações feitas usaram dados de seed pré-existentes para contornar os bloqueios e testar o restante da cadeia.
