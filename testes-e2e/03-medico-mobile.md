# Médico Mobile (MED-*)

## Onboarding / validação

### MED-01 — Cadastro médico (fluxo real)
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** `/user-selection` → "Usar como médico/Prescritor" → preencher formulário de cadastro (mesmo padrão de PAC-01/02)
- **Resultado esperado:** grava `profiles.tipo_usuario='medico'` + `medicos(status='pendente_aprovacao')`
- **Verificação backend:** confirmado — `medicos.status='pendente_aprovacao'`, `crm='999888'`
- **Status:** ✅ passou — 2026-07-10, conta `teste.e2e.medico@canfy-test.local`

### MED-02 — Validação profissional etapa 1 (dados profissionais)
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** `/professional-validation/step1-professional-data` — CPF, CRM+UF, especialidade, tempo de atuação, queixas atendidas, endereço profissional (CEP/logradouro/número/bairro/cidade/UF) → "Próximo"
- **Resultado esperado:** avança para etapa 2 (documentos)
- **Status:** ✅ passou — 2026-07-10
- **Achado:** tela mostra "Valor: R$ 89,90" (bate com a especificação do board de Discovery: preço fixo de consulta ¹¹ — na verdade essa é uma taxa/valor cobrado do próprio médico durante o onboarding, distinto do valor de R$ 200,00 cobrado do paciente pela consulta, que é o valor real hoje configurado no sistema — ver REG-09 ajustado)
- **Achado de dado:** dropdown de especialidade tem entradas duplicadas com grafias diferentes ("Neurologia"/"Neurologista", "Psiquiatra"/"Psiquiatria")

### MED-02 (continuação) — Upload de documentos — BLOQUEADO
- **Status:** ❌ **falhou** — ver REG-11. O upload de RG/CNH, comprovante de residência, CRM/CRO e diploma não funciona no Flutter web (`PlatformFile.path` inacessível), então a etapa 2 nunca completa e o "Próximo" fica desabilitado para sempre.
- **Evidência de produção:** os 3 médicos de seed pré-existentes no banco também estão travados em "Etapa 1 de 3" — mesmo padrão do bug.

### MED-03 — Trava em pending_review até aprovação
- **Status:** ⬜ não testado diretamente (o app não force-rediciona para `pending_review` visivelmente após login, pois usei o admin para aprovar antes de testar login — ver MED-04)

### MED-05 — Login de médico recusado
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Pré-condições:** médico recusado pelo admin (segunda conta de teste criada especificamente para este caso, `teste.e2e.medico.recusado@canfy-test.local`, recusada via ADM-06 com motivo real)
- **Passos:** `/login` com credenciais do médico recusado
- **Resultado esperado:** login deveria informar a recusa e o motivo
- **Resultado observado:** login redireciona para `/professional-validation/status`, que mostra **"Sua documentação foi enviada com sucesso! Em análise"** — como se a solicitação estivesse pendente normalmente. **Nenhuma menção à recusa nem ao motivo**, apesar de `medicos.status_validacao='recusado'` e `medicos.motivo_recusa` estarem corretamente preenchidos no banco.
- **Status:** ❌ **falhou** — CRÍTICO. Ver REG-17. Um médico recusado nunca sabe que foi recusado.

### MED-04 — Login de médico aprovado → /home
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Pré-condições:** médico aprovado pelo admin (ver ADM-06 / E2E-03)
- **Passos:** `/login` com credenciais do médico
- **Resultado esperado:** redireciona para `/home` (dashboard do médico), não para `/professional-validation/status`
- **Status:** ✅ passou — 2026-07-10
- **Achado menor:** saudação "Boas vindas, Dr(a). Dr.!" — a heurística de extrair o "primeiro nome" (`nome.split(' ').first`) quebrou porque cadastrei o nome como "Dr. Teste E2E Canfy" (artefato do meu dado de teste, não necessariamente um bug real — usuários reais não digitam "Dr." no campo Nome Completo já que o app já prefixa "Dr(a)." sozinho)

## Atendimento

### MED-06 — Ver fila de consultas
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** nav "Atendimento" → aba "Próximas consultas"
- **Resultado esperado:** lista consultas "Na fila" (sem médico atribuído) e "Agendada" (já assumidas)
- **Status:** ✅ passou — 2026-07-10, 2 consultas de seed na fila (paciente "Emerson do Vale", R$ 200,00 cada)

### MED-07 — Assumir consulta da fila
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** clicar "Assumir consulta" numa linha "Na fila"
- **Resultado esperado:** card muda de "Na fila" para "Agendada"
- **Verificação backend:** `consultas.medico_id` passou de `null` para o id do médico logado, `status` continua `agendada` (correto)
- **Status:** ✅ passou — 2026-07-10

### MED-08 — Pré-consulta
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** clicar na consulta "Agendada"
- **Resultado esperado:** tela `/appointment/pre-consultation` com dados do paciente, queixas, sintomas, seções expansíveis (Resumo médico, Uso de canabinoides)
- **Status:** ✅ passou — 2026-07-10 (usa RPC `getProntuarioContexto`, que contorna corretamente o RLS quebrado — ver REG-12)

### MED-09/10/12 — Consulta em tempo real (iniciar atendimento) — BLOQUEADO
- **Status:** ❌ **falhou** — ver REG-12 (RLS crítico). Clicar "Iniciar atendimento" navega para `/appointment/live/:id`, mas a tela mostra "Erro ao carregar consulta: PostgrestException ... 0 rows" porque a policy de RLS `"Medicos and Admins can view pacientes"` nunca checa se o usuário é médico de fato (só admin/super_admin). Bloqueia toda a consulta em tempo real, emissão de receita e finalização do atendimento.

### MED-14 — Financeiro
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Resultado esperado:** "Total a receber", "Último/Próximo repasse", lista de repasses
- **Status:** ✅ passou — 2026-07-10 (estado vazio correto — médico de teste sem repasses ainda)

### MED-15 — Perfil / Agenda
- **Ambiente:** Médico mobile
- **Automação:** Playwright MCP
- **Passos:** `/profile` → "Agenda"
- **Resultado esperado:** seleção de dias da semana, recorrência, horários disponíveis (grade 08h00–…)
- **Status:** ✅ passou — 2026-07-10

---

*(MED-05/11/13/16 não testados nesta rodada — MED-05 negativo de login recusado, MED-11 emitir receita e MED-13 corrida na fila dependem de contornar REG-11/12 primeiro; MED-16 notificação de nova consulta compatível depende de REG-14)*
