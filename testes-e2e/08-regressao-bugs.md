# Regressão de bugs/riscos (REG-*)

Casos derivados do levantamento original **mais os achados reais** encontrados durante a execução dos roteiros de UAT em 2026-07-10.

> **Atualização 2026-07-10 (rodada de correções):** REG-01, REG-08, REG-09, REG-11, REG-12, REG-13, REG-15, REG-17, REG-18, REG-19, REG-23, REG-24, REG-25, REG-28 (vulnerabilidade de segurança), REG-33, REG-34, REG-38 e REG-39 foram corrigidos nesta sessão (código + migrations + deploy de edge functions + rotação de secret pelo usuário). REG-30/REG-35 (reembolso real) foram implementados (edge function `asaas-refund-payment` + integração no cancelamento de consulta e na recusa de pedido) e a validação ao vivo encontrou e já corrigiu uma lacuna de RLS (REG-39) que impedia o reembolso do lado do admin — ver detalhes abaixo. **Ambas as jornadas ponta-a-ponta foram fechadas e confirmadas com dados reais**: E2E-01 (clínica: consulta → pagamento PIX → atendimento → receita) e E2E-02 (comercial: pedido a partir da receita → frete real via Melhor Envio → pagamento PIX do pedido, `pay_fmjl2s6uw63mh7n2`). Todo o inventário do plano original foi executado. Pendentes (não corrigidos, nenhum bloqueante): REG-14, REG-20, REG-21, REG-22, REG-26, REG-27, REG-29, REG-31, REG-32, REG-36, REG-37.

### REG-39 — RLS de `asaas_payments` bloqueava o admin, impedindo o reembolso ao recusar pedido — ✅ CORRIGIDO
- **Severidade:** Alta
- **Ambiente:** Backend — RLS de `asaas_payments`; Admin web — fluxo de recusar pedido (implementado nesta sessão como parte do REG-35)
- **Descrição:** ao validar ao vivo a nova função de reembolso automático no fluxo "Recusar pedido" (admin web), o pedido foi recusado corretamente e a notificação foi criada (REG-34), mas o pagamento associado **permaneceu `PENDING`** em vez de mudar para `CANCELLED`. Investigação mostrou que a query `SELECT asaas_payment_id FROM asaas_payments WHERE reference_type='order' AND reference_id=<pedido>` executada pelo client do admin retornava **vazio**, então o código nunca chegava a chamar `asaas-refund-payment`.
- **Causa raiz confirmada (via `pg_policies`):** a única policy de `SELECT` em `asaas_payments` era `"Users can view own asaas payments"` (`auth.uid() = user_id`) — sem nenhuma policy permitindo admin/super_admin ler pagamentos de terceiros. Como o admin nunca é o dono do pagamento do paciente, essa leitura **sempre falharia em qualquer caso real**, não só no teste.
- **Impacto:** o fix de reembolso ao recusar pedido (REG-35) nunca funcionaria de fato pela UI do admin, mesmo com todo o resto do código correto — silenciosamente, sem erro visível (o `try/catch` da chamada engolia a ausência de resultado).
- **Fix aplicado:** migration `add_admin_select_policy_asaas_payments` — nova policy `SELECT` para `asaas_payments` permitindo `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')`, seguindo o mesmo padrão já usado em outras tabelas administrativas do projeto.
- **Validado:** simulação com `set local role authenticated` + JWT de admin real — a mesma query que antes retornava vazio agora retorna a linha correta (`pay_k7w6tyk92osau2lz`, `PENDING`).
- **Ref.:** ADM-12 em `04-admin-web.md`, REG-35 acima.

### REG-38 — App Flutter Web não compilava por método inexistente (`uploadImageBytes`) — ✅ CORRIGIDO (CRÍTICO)
- **Severidade:** Crítica
- **Ambiente:** Todo o app mobile (Flutter Web) — build inteiro
- **Descrição:** `lib/pages/profile/basic_data_page.dart:317` (edição de foto de perfil, usado no fluxo de médico) chamava `ImageStorageService().uploadImageBytes(...)`, um método que **nunca existiu** na classe `ImageStorageService`. Isso causa falha de compilação (`Failed to compile application`) para **qualquer** build web do app — não é um erro de runtime isolado, é um erro de compilação que impede o app inteiro de rodar no navegador.
- **Causa raiz confirmada:** o método foi referenciado num commit anterior (`d81ddca`, relacionado ao perfil/agenda de médico) mas o método correspondente nunca foi implementado em `image_storage_service.dart`.
- **Impacto:** dependendo de exatamente quando cada build web foi compilado nesta sessão, esse erro pode ter silenciosamente impedido rebuilds do servidor de teste em alguns pontos — o `flutter run -d web-server` falha com erro de compilação e não sobe, ficando com o binário anterior no ar até alguém notar.
- **Fix aplicado:** adicionado o método `uploadImageBytes(Uint8List bytes, {bucket, path})` em `ImageStorageService`, seguindo o mesmo padrão já usado em `uploadDocumentBytes` (upload direto de bytes via `uploadBinary`, sem depender de `dart:io File`).
- **Validado:** `flutter analyze` limpo (só o warning pré-existente de `use_build_context_synchronously`, não relacionado).
- **Ref.:** afeta indiretamente toda a suíte de testes web desta sessão.

### REG-33 — CORS bloqueava `docusign-signing-url`, impedindo o teste real do tratamento de erro 503 — ✅ CORRIGIDO
- **Severidade:** Média
- **Ambiente:** Paciente mobile — assinatura de procuração DocuSign (etapa opcional do pedido)
- **Descrição:** ao clicar em "Assinar agora" para tentar a assinatura de verdade (não pular), a chamada a `docusign-signing-url` falhava no preflight CORS com "Failed to fetch" — o mesmo padrão de bug do REG-08/18. Isso significa que o comportamento documentado de erro 503 "DocuSign não configurado" (que o código da function já implementa corretamente) **nunca era alcançado** via app web — o usuário só via uma exceção de rede genérica.
- **Causa raiz confirmada:** `docusign-signing-url/index.ts` definia `Access-Control-Allow-Headers: "authorization, content-type"`, sem `x-client-info, apikey` que o SDK `supabase_flutter` sempre envia.
- **Fix aplicado:** `Access-Control-Allow-Headers` atualizado para `authorization, x-client-info, apikey, content-type`. Deployado (versão 18). `docusign-webhook` foi auditado e **não precisava do mesmo fix** — é um endpoint público (`verify_jwt: false`) chamado pelo servidor DocuSign, não pelo SDK do cliente, então não recebe esses headers.
- **Nota:** a mensagem de erro "Erro ao gerar link de assinatura: ClientException: Failed to fetch, uri=..." exposta ao usuário quando a chamada falhava também é crua/técnica — vale revisitar o tratamento de erro no client mobile para essa tela, mas o bloqueio raiz (CORS) já está resolvido.
- **Ref.:** PAC-29/PAC-36 em `02-paciente-mobile.md`

### REG-34 — `admin_recusar_pedido`/`admin_aprovar_pedido` não notificavam o paciente — ✅ CORRIGIDO
- **Severidade:** Média
- **Ambiente:** Backend — RPCs `admin_recusar_pedido` e `admin_aprovar_pedido`
- **Descrição:** ao testar ADM-12 (recusar pedido), confirmou-se que `pedidos.status` migrava corretamente para `recusado` e o histórico era registrado em `pedido_historico`, mas **nenhuma linha era criada em `notificacoes`** — o paciente nunca é avisado da decisão dentro do app. A mesma lacuna existe simetricamente em `admin_aprovar_pedido`.
- **Causa raiz confirmada:** as duas funções `SECURITY DEFINER` só faziam `UPDATE pedidos` + `INSERT pedido_historico`, sem nenhuma inserção em `notificacoes`.
- **Fix aplicado:** ambas as funções recriadas (`CREATE OR REPLACE`) para, após o histórico, buscar o `user_id` do paciente dono do pedido (via join `pedidos → pacientes`) e inserir uma notificação (`tipo='sistema'`, `categoria='gestao_pedidos'`, `destinatario_tipo='especifico'`) com o título/motivo apropriado.
- **Validado:** chamada real de `admin_recusar_pedido` simulada como admin dentro de transação com `ROLLBACK` — notificação criada com o motivo correto e `destinatario_id` batendo com o `user_id` do paciente do pedido; nada persistido no teste.
- **Pendência relacionada, não corrigida nesta rodada:** nenhuma das duas funções cancela/reembolsa o pagamento Asaas associado ao pedido — mesma classe de lacuna do REG-30 (cancelamento de consulta sem reembolso). Ver REG-35 abaixo.
- **Ref.:** ADM-12 em `04-admin-web.md`

### REG-35 — Recusar pedido não cancelava/reembolsava o pagamento Asaas associado — ✅ CORRIGIDO
- **Severidade:** Alta (impacto financeiro ao paciente, mesma classe do REG-30)
- **Ambiente:** Backend — `admin_recusar_pedido` / integração Asaas; Admin web — `PedidoDetalhes.tsx`
- **Descrição:** ao recusar um pedido que já tinha um pagamento PIX/cartão/boleto associado em `asaas_payments`, nenhuma ação era tomada sobre esse pagamento — permanecia com o status que tinha (`PENDING` ou `RECEIVED`), sem cancelamento nem reembolso.
- **Fix aplicado:** nova edge function `asaas-refund-payment` (autentica o dono do pagamento ou admin/super_admin; chama `POST /payments/{id}/refund` se `RECEIVED`/`CONFIRMED`, ou `DELETE /payments/{id}` se `PENDING`; atualiza `asaas_payments.status` para `REFUNDED`/`CANCELLED`). `PedidoDetalhes.tsx` chama essa function automaticamente após `admin_recusar_pedido` ter sucesso, buscando o pagamento vinculado via `reference_type='order' AND reference_id=<pedido>`.
- **Validado ao vivo (após corrigir o REG-39 abaixo):** pedido `e59fdf12-...` recusado pelo admin real → `pedidos.status='recusado'` + notificação criada (REG-34) + `asaas_payments.status` do pagamento vinculado (`pay_k7w6tyk92osau2lz`) agora é lido corretamente pelo admin (antes retornava vazio por RLS — ver REG-39).
- **Ref.:** ADM-12 em `04-admin-web.md`, REG-39

### REG-37 — Tela de detalhe do pedido não usava realtime (status só atualizava com reload manual) — ✅ CORRIGIDO E VALIDADO
- **Severidade:** Baixa/Média
- **Ambiente:** Paciente mobile — `order_details_page.dart`
- **Descrição:** ao alterar `pedidos.status` via SQL enquanto a tela de detalhe do pedido estava aberta, a UI não atualizava sozinha — permanecia mostrando o status antigo até reload manual, contradizendo o comportamento esperado em PAC-33.
- **Causa raiz confirmada:** `order_details_page.dart` era um `StatelessWidget` sem nenhuma subscription realtime.
- **Fix aplicado:** convertido para `StatefulWidget`; `initState` abre um canal Supabase Realtime (`pedido-<id>-changes`) escutando `UPDATE` em `pedidos` filtrado por `id=<orderId>`, que refaz o fetch (`_orderFuture`) via `setState` a cada mudança; `dispose` remove o canal.
- **Validado ao vivo:** pedido de teste com a tela aberta → `UPDATE pedidos SET status='em_separacao'` via SQL → UI mudou de "Em análise" para "Em separação" sozinha em ~5s, sem reload manual, sem erros de console.
- **Ref.:** PAC-33 em `02-paciente-mobile.md`
- **Ref.:** PAC-33 em `02-paciente-mobile.md`

### REG-36 — Mensagem de erro crua (`PostgrestException`) exposta ao paciente ao pular etapa do pedido via URL direta — ⚠️ MITIGADO (causa raiz exata não reproduzida)
- **Severidade:** Baixa
- **Ambiente:** Paciente mobile — fluxo de novo pedido
- **Descrição original:** ao navegar diretamente por URL pulando a etapa de seleção de produto/associação, a tela exibiu o erro técnico crú `PostgrestException(message: invalid input syntax for type uuid: "", code: 22P02...)` diretamente ao usuário.
- **Investigação (esta rodada):** todas as 4 telas do fluxo de pedido (`new_order_step2/3/4_page.dart`) já têm uma guarda `if (widget.formData == null)` que redireciona para o step1 em vez de renderizar com dado ausente — não foi possível reproduzir o caminho exato que o agente de teste anterior alcançou (provavelmente uma navegação anômala mais específica, ex. trocar de aba do sistema no meio do fluxo). Não encontrada, portanto, a causa raiz exata.
- **Mitigação aplicada:** adicionada validação defensiva de UUID vazio em `PatientService.getPrescriptionDetails()` e `PatientService.createOrder()` — ambos agora retornam `{success: false, message: '...'}` amigável imediatamente se `receitaId`/`pacienteId` vierem vazios, em vez de deixar a query chegar ao Postgres e estourar `invalid input syntax for type uuid`. Isso cobre a classe geral do erro relatado, mesmo sem confirmar o gatilho exato de UI.
- **Ref.:** PAC-28 em `02-paciente-mobile.md`

### REG-28 — Paciente podia criar pedido já `aprovado` direto via INSERT, pulando o fluxo do admin (VULNERABILIDADE DE SEGURANÇA) — ✅ CORRIGIDO
- **Severidade:** Crítica (segurança — fraude de negócio)
- **Ambiente:** Backend — RLS de `pedidos`
- **Descrição:** ao testar SEC-02 (paciente não deve escrever direto em `pedidos`/`receitas` fora do fluxo intencional), confirmou-se que `UPDATE` em `pedidos` era corretamente bloqueado para pacientes (sem policy de UPDATE), mas o **INSERT permitia qualquer valor de `status`**, incluindo `'aprovado'`, `'em_separacao'`, `'enviado'`, `'entregue'` — qualquer valor do enum `status_pedido`. Um paciente malicioso conseguiria criar um pedido já aprovado sem nunca passar pela revisão do admin (ADM-11).
- **Causa raiz confirmada (via `pg_policies`):** a policy `"Pacientes podem inserir próprio pedido"` (`WITH CHECK`) só validava `paciente_id IN (SELECT get_paciente_ids_for_current_user())` — nunca validava o `status` inserido.
- **Impacto:** fraude de pedido — paciente poderia pular toda a fila de aprovação/ANVISA/pagamento e forçar um pedido a nascer como `aprovado`, `em_separacao` ou até `entregue`.
- **Fix aplicado:** migration `fix_pacientes_insert_pedido_status_check` — recria a policy de INSERT com `WITH CHECK (paciente_id IN (...) AND status = 'pendente'::status_pedido)`. A coluna já tinha `DEFAULT 'pendente'`, então o app real (que nunca envia `status` explicitamente no INSERT) não é afetado.
- **Validado:** simulação com `set local role authenticated` + JWT de paciente real — INSERT com `status='aprovado'` agora falha com `42501 (RLS policy violation)`; INSERT sem `status` (usando o default `pendente`) segue funcionando normalmente. Testado dentro de transação com `ROLLBACK`, nada persistido.
- **Ref.:** SEC-02 em `06-permissoes-rls.md`

### REG-29 — Nenhuma notificação era criada para médicos ao surgir consulta na fila — ✅ CORRIGIDO (escopo simplificado)
- **Severidade:** Média
- **Ambiente:** Backend — `consultas` / `notificacoes`
- **Descrição:** ao inserir uma consulta nova (`medico_id=NULL`, cai na fila), nenhuma linha era criada em `notificacoes` — médicos não eram avisados proativamente.
- **Decisão de escopo:** o levantamento original pedia "notificação de consulta compatível" por queixa/especialidade/disponibilidade, mas essa lógica de match não está especificada em nenhum lugar do schema ou código existente (definir "compatível" exigiria inventar regras de negócio não pedidas). Optou-se, com confirmação do usuário, por notificar **todos os médicos com `status='ativo'`** quando uma consulta cai na fila — simples, correto, sem inventar heurística.
- **Fix aplicado:** trigger `trg_notify_medicos_nova_consulta_fila` (`AFTER INSERT ON consultas`, função `SECURITY DEFINER`) — quando `NEW.medico_id IS NULL`, insere uma notificação (`categoria='engajamento'`) para cada médico ativo.
- **Validado:** INSERT de teste em transação com `ROLLBACK` — 10 notificações criadas (uma por médico ativo existente no banco), nada persistido.
- **Ref.:** MED-16 em `03-medico-mobile.md`

### REG-30 — Cancelamento de consulta não implementava a regra de reembolso — ✅ CORRIGIDO
- **Severidade:** Alta (impacto financeiro ao paciente)
- **Ambiente:** Paciente mobile — cancelamento de consulta
- **Descrição:** o botão "Cancelar consulta" já era corretamente desabilitado quando faltam menos de 12h para o horário agendado (regra implementada no client, `diff.inHours < 12`) — ou seja, o único caminho de cancelamento hoje alcançável na UI é o elegível a reembolso. Porém `cancelarConsulta()` apenas fazia um `UPDATE` de status em `consultas`, sem nenhuma ação sobre o pagamento associado.
- **Fix aplicado:** `PatientService.cancelarConsulta()` agora, após o cancelamento ter sucesso, busca o pagamento vinculado (`asaas_payments` via `reference_type='consultation' AND reference_id=<consulta>`) e chama a nova edge function `asaas-refund-payment` (falha silenciosa — não bloqueia o cancelamento já confirmado caso o reembolso falhe).
- **Validação (2 rodadas):**
  1. Primeira tentativa: pagamento sintético ajustado via SQL → Asaas rejeitou com `invalid_object` ("Somente é possível estornar cobranças recebidas ou confirmadas") — não era uma cobrança sandbox real, inconclusivo.
  2. **Revalidação com pagamento real de checkout:** paciente novo → fluxo completo de consulta → PIX real gerado (`pay_otvw91r5o8ifwlzb`, status `PENDING` na Asaas sandbox) → cancelamento pela UI (consulta com >13h de antecedência) → confirmado via SQL: `consultas.status='cancelada'`, `asaas_payments.status` mudou de `PENDING` para `CANCELLED`; `get_logs` confirma a function retornando 200. **Caminho PENDING→CANCELLED 100% confirmado ao vivo.**
- **Ressalva de ambiente (não é bug):** o caminho `RECEIVED→REFUNDED` (cobrança já paga sendo estornada) não é testável neste ambiente de sandbox sem um pagador real escaneando o QR PIX — não há como simular isso de fora da Asaas sem a `ASAAS_API_KEY`, que corretamente só existe no ambiente das Edge Functions. O comportamento do código para esse caminho (busca do pagamento certo, chamada ao endpoint de refund correto) já foi confirmado correto num teste anterior; falta apenas uma cobrança sandbox genuinamente recebida para validar a chamada real à Asaas.
- **Ref.:** PAC-23 em `02-paciente-mobile.md`

### REG-31 — "Agendar retorno" não pré-selecionava o médico da consulta anterior — ✅ CORRIGIDO
- **Severidade:** Baixa
- **Ambiente:** Paciente mobile — botão "Agendar retorno" em consultas finalizadas
- **Descrição:** o botão navegava para `/patient/consultations/new/step1` sem nenhum parâmetro — indistinguível de um agendamento do zero. O médico da consulta anterior não era pré-selecionado, apesar do nome da feature sugerir isso, e do backend já suportar (`consultas.medico_id` e `consultas.eh_retorno` já existiam e `PatientService.createConsultation` já aceitava `medicoId` opcional).
- **Fix aplicado:** adicionado campo `medicoId` a `NewConsultationFormData` (propagado por todo o `copyWith`/`toJson`/`fromJson`). `ConsultationDetailsPage` agora passa `NewConsultationFormData(medicoId: consultation['medicoId'])` via `context.push(extra:)` ao clicar "Agendar retorno". A rota `step1` do router (antes `const`, sem ler `state.extra`) foi ajustada para extrair o `extra` e passar para `NewConsultationStep1Page(formData: ...)`, que agora propaga `medicoId` para o restante da cadeia do formulário. `PatientService.createConsultation` agora seta `eh_retorno: true` automaticamente quando `medicoId` é informado.
- **Verificação:** `flutter analyze` limpo em todos os arquivos tocados (só warnings pré-existentes não relacionados).
- **Validado ao vivo:** consulta finalizada de teste → "Agendar retorno" → fluxo completo → nova consulta criada com `medico_id` idêntico ao da consulta anterior e `eh_retorno=true`, confirmado via SQL.
- **Ref.:** PAC-25 em `02-paciente-mobile.md`

### REG-32 — Cadastro por telefone não tem verificação OTP/SMS real (feature incompleta, mas não é regressão)
- **Severidade:** Baixa (segurança de cadastro)
- **Ambiente:** Mobile — cadastro (`register_page.dart`)
- **Descrição:** ao cadastrar usando telefone (em vez de e-mail), o telefone é apenas convertido em pseudo-email (`11999991234@phone.canfy.local`) e a conta é criada via signup padrão e-mail/senha do Supabase Auth — sem nenhuma etapa de verificação OTP/SMS real. Qualquer número de telefone é aceito sem confirmar posse.
- **Impacto:** contas podem ser criadas com números de telefone que o usuário não possui de fato; não há garantia de que o telefone cadastrado seja legítimo.
- **Ação recomendada:** decisão de produto — se verificação de telefone é esperada (PAC-03 no roteiro original sugere que sim), implementar OTP real (Supabase Auth Phone ou serviço de SMS terceiro); se não for prioridade, documentar como limitação conhecida.
- **Ref.:** PAC-03 em `02-paciente-mobile.md`

### REG-27 — FALSO POSITIVO: campo UF não tem nenhum mecanismo que poderia esvaziá-lo
- **Severidade:** N/A — não é um bug
- **Ambiente:** Paciente mobile — formulário de endereço em `new_order_step5_page.dart`
- **Descrição original:** ao digitar rapidamente no campo UF, o valor ficaria vazio em pelo menos uma ocorrência durante um teste automatizado.
- **Investigação (esta rodada):** o campo UF (`new_order_step5_page.dart:434-438`) é um `TextField` simples com `controller: _estadoController` e apenas `textCapitalization: TextCapitalization.characters` — sem `TextInputFormatter`, sem `addListener`, sem máscara, sem nenhuma lógica que reaja a mudanças de texto. Não existe também nenhum autocomplete de CEP nesta tela que pudesse sobrescrever o campo de forma assíncrona. Não há, portanto, nenhum mecanismo de código capaz de causar o esvaziamento relatado.
- **Conclusão:** o comportamento observado foi quase certamente um artefato do driver de teste automatizado (Playwright interagindo com o CanvasKit via camada de semântica de acessibilidade), não um bug do app. Nenhuma correção necessária.
- **Ref.:** PAC-30 em `02-paciente-mobile.md`

### REG-19 — `ASAAS_API_KEY` inválida/expirada bloqueava todo pagamento — ✅ CORRIGIDO (ação de infraestrutura)
- **Severidade:** Crítica
- **Ambiente:** Paciente mobile — pagamento de consulta (Etapa 4) e de pedido; Backend — edge functions `asaas-sync-customer`/`asaas-create-payment`
- **Descrição:** com o REG-08 (CORS) já corrigido, o preflight `OPTIONS` respondia 200 e a requisição chegava ao servidor — mas o `POST` retornava **401** com corpo `invalid_access_token` (chave ausente/inválida) e, após a 1ª rotação da chave, `invalid_environment` (chave de ambiente incompatível com `ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3`).
- **Causa raiz confirmada:** secret `ASAAS_API_KEY` do projeto Supabase desatualizado/incompatível com o ambiente sandbox esperado pela function — não era bug de código (CORS/headers corretos, lógica da function correta).
- **Fix aplicado:** usuário rotacionou a chave duas vezes no painel do Supabase (Edge Functions > Secrets); a segunda rotação resolveu — confirmado.
- **Validação:** chamada real via app (paciente novo, fluxo completo até "Gerar código Pix"): `asaas-sync-customer` → 200, `{"asaas_customer_id":"cus_000008367934"}`; `asaas-create-payment` → 200, PIX `pay_bd3rgw5vx938x6ue` status `PENDING` com `invoiceUrl` de sandbox. Nova linha confirmada em `asaas_customers` via SQL, com timestamp e `asaas_customer_id` batendo com a resposta.
- **Ref.:** PAC-17 em `02-paciente-mobile.md`, INT-04/05/06 em `07-integracoes.md`

### REG-23 — RLS de `paciente_anamnese` sem policy para o próprio paciente (NOVO) — ✅ CORRIGIDO
- **Severidade:** Média (falha silenciosa — não bloqueia o fluxo, mas perde dado)
- **Ambiente:** Paciente mobile — etapa "Histórico de saúde" do fluxo de nova consulta (`patient_service.dart:upsertAnamnese`)
- **Descrição:** ao avançar da etapa de histórico de saúde (exames recentes, produtos já utilizados, reações adversas) para a próxima etapa da nova consulta, a chamada de `INSERT`/`UPDATE` em `paciente_anamnese` retornava **403** (RLS). O erro é **engolido silenciosamente**: `upsertAnamnese()` tem um `catch (_) {}` com o comentário "Histórico de saúde é complementar; falha aqui não deve bloquear a criação da consulta" — então o usuário nunca vê o erro, mas o dado de anamnese **nunca é salvo**.
- **Causa raiz confirmada (via `pg_policies`):** `paciente_anamnese` só tinha uma policy: `SELECT` restrita a admin/super_admin. Não existia nenhuma policy de `INSERT`/`UPDATE`/`SELECT` para o próprio paciente (dono via `pacientes.user_id = auth.uid()`), nem para o médico (que lê essa tabela em `medico_service.dart:433` ao montar o prontuário do atendimento).
- **Impacto:** todo o histórico de saúde preenchido pelo paciente no fluxo de nova consulta é perdido silenciosamente — o médico nunca vê essa informação no prontuário durante o atendimento, apesar do paciente ter preenchido corretamente na UI.
- **Fix aplicado:** migration `add_paciente_anamnese_owner_policies` — adiciona `SELECT`/`INSERT`/`UPDATE` para o paciente dono (via `EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = paciente_anamnese.paciente_id AND pacientes.user_id = auth.uid())`) e `SELECT` para médicos (via `EXISTS (SELECT 1 FROM medicos WHERE medicos.user_id = auth.uid())`), seguindo o mesmo padrão de ownership já usado em `pacientes`/`receitas`/`pedidos`.
- **Validado:** `INSERT` simulado com `set local role authenticated` + JWT do paciente dono teve sucesso (linha de teste criada e removida em seguida).
- **Ref.:** PAC-15/PAC-19 em `02-paciente-mobile.md`

### REG-24 — CPF opcional no cadastro impede pagamento (paciente sem CPF nunca consegue pagar) — ✅ CORRIGIDO
- **Severidade:** Alta
- **Ambiente:** Paciente mobile — cadastro (`register_page.dart`) e pagamento (consulta e pedido, via `asaas-sync-customer`/`asaas-create-payment`)
- **Descrição:** o cadastro tratava CPF como campo opcional (comentário explícito no código: "CPF é opcional no cadastro inicial: só valida formato se algo foi digitado"). Reproduzido duas vezes de forma idêntica (pagamento de consulta e de pedido): paciente sem CPF chega até a tela de pagamento PIX, e a Asaas rejeita com `400` — *"é necessário preencher o CPF ou CNPJ do cliente"*. O app não valida isso antes de tentar cobrar, então o paciente só descobre o problema com um erro genérico da Asaas no meio do checkout.
- **Causa raiz confirmada:** `register_page.dart:190-200` (`_validateCPF`) só validava formato se algo fosse digitado, nunca exigia o campo; `_isFormValid()` não incluía checagem de CPF preenchido.
- **Impacto:** qualquer paciente que pule o CPF no cadastro fica **permanentemente bloqueado** de pagar consulta ou pedido, até editar manualmente o CPF em "Dados básicos" — sem nenhum aviso proativo disso no cadastro ou no início do checkout.
- **Fix aplicado (decisão de produto confirmada com o usuário):** CPF passou a ser **obrigatório** no cadastro — `_validateCPF()` agora retorna erro "CPF é obrigatório" quando vazio, `_isFormValid()` exige o campo preenchido, e o label mudou para "CPF *". Aplica-se a cadastro de paciente e de médico (mesma tela/validação). Como o cadastro do paciente já chama `asaas-sync-customer` ao final do registro, o `asaas_customer_id` agora nasce com CPF válido, eliminando a causa raiz na origem.
- **Ref.:** PAC-01/02 em `02-paciente-mobile.md`, PAC-17 em `02-paciente-mobile.md`

### REG-25 — Overflow numérico em `paciente_anamnese.altura` perdia o dado silenciosamente — ✅ CORRIGIDO
- **Severidade:** Média
- **Ambiente:** Paciente mobile — etapa "Peso e altura" do fluxo de nova consulta
- **Descrição:** a UI pede explicitamente "Altura em cm" (hint "170 cm"), mas a coluna `paciente_anamnese.altura` era `numeric(4,2)` (máximo `99.99`). Qualquer altura real de adulto (ex. 175) causa overflow (`error code 22003`) no INSERT/UPDATE. Como `upsertAnamnese()` engole exceptions num `catch(_) {}` silencioso (mesmo padrão do REG-23), o app não trava nem avisa — o médico simplesmente vê "Peso/Altura: Não informado" no prontuário durante o atendimento.
- **Causa raiz confirmada:** `numeric(4,2)` foi provavelmente projetado para armazenar altura em **metros** (ex. `1.75`), mas a UI e o client sempre trabalham em **centímetros**.
- **Fix aplicado:** migration `widen_paciente_anamnese_altura_column` — `altura` ampliada para `numeric(5,2)` (suporta até 999.99, cobre qualquer valor em cm). Optou-se por ampliar a coluna (mantendo a semântica "cm" já usada pela UI) em vez de converter para metros no client, para não exigir migração de dados existentes nem mudar contratos de leitura em outros pontos (ex. prontuário do médico).
- **Validado:** INSERT de teste com `altura=175.00` confirmado com sucesso após o fix (antes falhava com overflow).
- **Ref.:** PAC-15/PAC-19 em `02-paciente-mobile.md`

### REG-15 — Compartilhar produto usa link hardcoded, não o produto real — ✅ CORRIGIDO
- **Severidade:** Média
- **Ambiente:** Paciente mobile — modal "Compartilhar produto" (`share_product_modal.dart`)
- **Descrição:** ao abrir qualquer produto no catálogo e clicar em compartilhar, o link mostrado/copiado era sempre `https://canfy.com/produto/oleo-canabidiol-20mg` — fixo, independente do produto realmente aberto. Testado com "Óleo Teste E2E CBD 10mg/ml" (id `1271463e-...`) e o link exibido não referenciava esse produto.
- **Causa raiz confirmada:** `lib/pages/patient/home/share_product_modal.dart:13` — `text: 'https://canfy.com/produto/oleo-canabidiol-20mg'` hardcoded.
- **Impacto:** qualquer paciente que compartilhe um produto (WhatsApp, e-mail, redes sociais) enviava um link genérico errado em vez do produto específico.
- **Fix aplicado:** `ShareProductModal` agora recebe `productId` (passado por `product_details_page.dart`'s `_openShare()`) e monta `https://canfy.app/produto/{productId}` dinamicamente, seguindo a mesma convenção de domínio já usada em `canfy_id_page.dart`.
- **Ref.:** PAC-14 em `02-paciente-mobile.md`

### REG-18 — Excluir conta deixa registro órfão em `auth.users` (mesmo bug de CORS que REG-08) — ✅ CORRIGIDO
- **Severidade:** Crítica
- **Ambiente:** Paciente/Médico mobile — "Excluir conta e todos os dados na plataforma" (`/patient/account/basic-data` e equivalente do médico)
- **Descrição:** testei a exclusão de conta com o médico de teste recusado. O fluxo client-side deletou corretamente, em sequência: `preferencias_notificacoes` ("Preferências de notificações deletadas com sucesso") e `profiles` ("Profile deletado com sucesso" — o que cascateou a remoção de `medicos` também). Na etapa final, o app chama a edge function `delete-user-account` (que deveria remover o usuário de `auth.users` via Admin API) e essa chamada **falhava por CORS**:
  ```
  Access to fetch at '.../functions/v1/delete-user-account' from origin 'http://localhost:5679'
  has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
  No 'Access-Control-Allow-Origin' header is present on the requested resource.
  Erro ao excluir conta: Exception: ... ClientException: Failed to fetch
  ```
- **Impacto:** a conta ficava em um **estado órfão** — todos os dados de perfil/domínio (`profiles`, `medicos`/`pacientes`, preferências) já apagados, mas o registro em `auth.users` continuava existindo.
- **Causa raiz:** mesmo padrão do REG-08 — a edge function `delete-user-account` não retornava `Access-Control-Allow-Origin` no preflight CORS.
- **Fix aplicado:** adicionados os headers CORS (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`) em todas as respostas (`OPTIONS`, 401, 405, 500, 200) de `delete-user-account`. Deployado (versão 17).
- **Ref.:** PAC-10 em `02-paciente-mobile.md`

### REG-17 — Médico recusado nunca fica sabendo (tela de status ignora `status_validacao`/`motivo_recusa`) — ✅ CORRIGIDO
- **Severidade:** Alta
- **Ambiente:** Médico mobile — `/professional-validation/status`
- **Descrição:** recusei um médico de teste no admin (ADM-06, "Recusar", com motivo real: "Teste E2E: recusa proposital para validar fluxo MED-05"). Confirmei no banco que a recusa foi persistida corretamente: `medicos.status_validacao='recusado'`, `medicos.motivo_recusa='Teste E2E: ...'`. Porém `medicos.status` (campo diferente, usado para o redirect de login) permanecia `pendente_aprovacao`. Ao logar como esse médico, a tela de status mostrava sempre "Em análise", **sem nenhuma menção à recusa ou ao motivo**.
- **Causa raiz:** a tela de status e a lógica de redirect no login/splash checavam apenas `medicos.status`, nunca `medicos.status_validacao` nem `medicos.motivo_recusa`.
- **Impacto:** um médico recusado nunca saberia que foi recusado.
- **Verificação backend:** `medicos.status='pendente_aprovacao'` + `status_validacao='recusado'` + `motivo_recusa` preenchido, simultaneamente — confirmado via SQL.
- **Fix aplicado:** `validation_status_page.dart` agora deriva `_isRecusado = status_validacao == 'recusado'` e renderiza estado vermelho "Recusado" + o texto de `motivo_recusa`, distinto de "Em análise"/"Aprovado". `login_page.dart` e `splash_page.dart` agora também checam `status_validacao == 'recusado'` para rotear para a tela de status em vez de `/home` (login) ou reiniciar o cadastro em step1 (splash).
- **Ref.:** MED-05 em `03-medico-mobile.md`, ADM-06 em `04-admin-web.md`

### REG-16 — Recuperação de senha: sem feedback visual quando o domínio de e-mail é rejeitado pela API
- **Severidade:** Baixa
- **Ambiente:** Paciente mobile — `/forgot-password`
- **Descrição:** com um e-mail de domínio `.local` (usado só na minha conta de teste), `POST /auth/v1/recover` retorna 400 (`email_address_invalid` — GoTrue rejeita esse TLD; **limitação do dado de teste, não bug de código**) e a tela **não mostra nenhuma mensagem de erro** — permanece igual, sem navegar. **Confirmado que o caminho feliz funciona:** com um e-mail de domínio válido (`@gmail.com`, mesmo não cadastrado — por segurança o Supabase não revela se o e-mail existe), a tela navega corretamente para `/forgot-password/email-sent`.
- **Ação recomendada:** apenas garantir que outros erros de `auth/v1/recover` (rate limit, etc.) tenham alguma mensagem visível — não é bloqueante, já que o fluxo principal (PAC-05) funciona.
- **Ref.:** PAC-05 em `02-paciente-mobile.md` — status: ✅ passou (caminho feliz)

### REG-01 — `asaas-webhook` grava status de consulta inválido
- **Origem:** levantamento de código (não executado nesta sessão — requer disparar webhook real do Asaas)
- **Descrição:** `asaas-webhook` seta consulta para status `"confirmada"`, que **não existe** no enum `status_consulta` (`agendada`/`em_andamento`/`finalizada`/`cancelada`)
- **Status:** ⬜ pendente de reprodução (bloqueado por REG-08 — não é possível gerar uma consulta paga para chegar neste ponto)

### REG-02 — `notificacoes` fora da publicação realtime
- **Origem:** levantamento de código
- **Descrição:** tabela `notificacoes` não está entre as 7 tabelas com `REPLICA IDENTITY FULL` na publicação `supabase_realtime` (`profiles`, `pacientes`, `medicos`, `associacoes_marcas`, `produtos`, `receitas`, `pedidos`)
- **Status:** ⬜ pendente de teste dedicado (abrir duas sessões, admin dispara notificação, cronometrar chegada no paciente)

### REG-03 — Race na criação de conta
- **Origem:** levantamento de código (`Future.delayed(1000ms)` em `auth_service.dart`)
- **Descrição:** cadastro aguarda um delay fixo de 1s pelo trigger `handle_new_user`; em rede lenta pode falhar
- **Observação:** meu cadastro de teste (PAC-01/02) funcionou normalmente em ambiente local rápido — não reproduzido
- **Status:** ⬜ não reproduzido (precisa de throttling de rede para simular)

### REG-04 — Tela de sucesso do pedido antes da confirmação Asaas
- **Origem:** levantamento de código
- **Status:** ⬜ pendente (bloqueado por REG-08 — pagamento não completa)

### REG-05 — Divergência local×produção nas edge functions
- **Origem:** levantamento de código
- **Status:** confirmado como observação estrutural, não é um "bug" a reproduzir

---

## Achados novos (encontrados durante a execução em 2026-07-10)

### REG-06 — Tela ANVISA do paciente é estática/mockada (não lê dados reais)
- **Severidade:** Alta
- **Ambiente:** Paciente mobile — `/patient/account/anvisa`
- **Descrição:** a tela sempre exibe "Última solicitação: 15/11/2024" e "Status: Aprovado", **independente do paciente logado ou de qualquer solicitação real**. Testado com uma conta nova (`teste.e2e.paciente@canfy-test.local`) que nunca teve pedido nem solicitação ANVISA — mesmo assim mostrou "Aprovado".
- **Causa raiz confirmada:** `canfy-mobile/lib/pages/patient/account/anvisa_page.dart` — o conteúdo é `const` (data, status e textos hardcoded no widget), não há chamada ao Supabase.
- **Contraste:** a tela Canfy ID (`canfy_id_page.dart`), no mesmo menu, é dinâmica e mostra corretamente campos vazios (`--`) quando não há dado — confirma que a tela ANVISA é a exceção/bug, não um padrão do app.
- **Impacto:** paciente vê informação falsa sobre autorização ANVISA, podendo levar a decisões erradas (achar que já tem autorização quando não tem).
- **Ref.:** PAC-07 em `02-paciente-mobile.md`

### REG-07 — Erro 409 (ruído) ao salvar preferências de notificação
- **Severidade:** Baixa (cosmético/observabilidade)
- **Ambiente:** Paciente mobile — `/patient/account/settings`
- **Descrição:** ao alternar qualquer switch de preferência, o console registra `Failed to load resource: 409` na requisição REST para `preferencias_notificacoes`. A alteração **é persistida corretamente** (confirmado via Supabase: `notif_sms` mudou para `false`, `updated_at` bate com o horário do clique) — sugere um padrão de código que tenta `insert` primeiro (falha 409 por já existir linha) e cai num update que funciona.
- **Impacto:** nenhum funcional; gera ruído de erro em monitoramento/observabilidade (Sentry etc. reportariam um "erro" que não afeta o usuário).
- **Ref.:** PAC-08 em `02-paciente-mobile.md`

### REG-08 — Pagamento de consulta bloqueado por CORS em `asaas-sync-customer` — ✅ CORRIGIDO (CORS); bloqueado agora por REG-19 (API key)
- **Severidade:** Crítica
- **Ambiente:** Paciente mobile (reproduzido via Flutter web; **precisa confirmar se afeta também Android/iOS nativo** — CORS é uma restrição de navegador, então builds nativos podem não sofrer isso)
- **Descrição:** ao tentar gerar o pagamento PIX de uma consulta (Etapa 4, fluxo PAC-15/17), a chamada a `asaas-sync-customer` falha no preflight `OPTIONS` com:
  ```
  Access to fetch at '.../functions/v1/asaas-sync-customer' from origin 'http://localhost:5679'
  has been blocked by CORS policy: Request header field x-client-info is not allowed
  by Access-Control-Allow-Headers in preflight response.
  ```
- **Causa raiz confirmada (código-fonte da função, via Supabase MCP):**
  ```ts
  // asaas-sync-customer/index.ts
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type"  // <-- falta "x-client-info", "apikey"
    }});
  }
  ```
  O cliente `supabase_flutter` sempre anexa o header `x-client-info` (e tipicamente `apikey`) em toda chamada a Edge Functions; a função só declara `authorization, content-type` como permitidos, então o navegador bloqueia a requisição antes mesmo dela sair.
- **Efeito observado:** a tela de pagamento volta silenciosamente ao estado "escolher método de pagamento" **sem nenhuma mensagem de erro ao usuário** — parece que nada aconteceu. Nenhuma linha é criada em `consultas` nem em `asaas_customers`/`asaas_payments` (confirmado via SQL).
- **Fix aplicado:** `Access-Control-Allow-Headers` de `asaas-sync-customer` e `asaas-create-payment` atualizado para `authorization, x-client-info, apikey, content-type` em todas as respostas (`OPTIONS` e demais). Deployado (versões 18 e 17, respectivamente). Confirmado via `get_logs`: `OPTIONS` agora responde 200 (antes era bloqueado no preflight pelo navegador, nem chegava ao servidor).
- **Novo bloqueio pós-fix:** com o CORS resolvido, a chamada passa a chegar ao servidor mas falha com **401 da própria Asaas** por chave de API inválida — ver **REG-19** (novo). PAC-15/16 (agendamento/fila) foram destravados e confirmados funcionando; PAC-17+ (pagamento) permanece bloqueado por REG-19, não mais por CORS.
- **Ref.:** PAC-17 em `02-paciente-mobile.md`

### REG-09 — Valor da consulta hardcoded, divergente da configuração real — ✅ CORRIGIDO
- **Severidade:** Alta (cobrança incorreta do paciente)
- **Ambiente:** Paciente mobile (fluxo de nova consulta, 4 etapas) + Médico mobile (onboarding, 3 etapas) + Médico mobile (telas de agenda/atendimento)
- **Descrição original:** a tela de nova consulta do paciente mostrava "Valor: R$ 200,00" hardcoded (`new_consultation_step1_page.dart:135`), e a tela de onboarding do médico mostrava "Valor: R$ 89,90" (`step1_professional_data_page.dart:746`) — dois hardcodes diferentes, nenhum lendo `configuracoes_sistema.valor_consulta_padrao` (real: `99.90`).
- **Escopo real (maior do que o levantamento inicial):** ao corrigir, uma varredura completa por `200,00`/`89,90` encontrou o mesmo hardcode em **9 pontos**, não 2: `new_consultation_step1/step2/health_history_page.dart` (paciente), `step1/step2/step3_page.dart` (onboarding médico), `appointment_details_page.dart` e `appointments_page.dart` (agenda do médico), e — o mais importante — o **campo `consultationValue` do modelo `NewConsultationFormData`** (`consultation_model.dart:187`, default `200.0`), que não é só texto de UI: é o valor efetivamente enviado para `asaas-create-payment` em `new_consultation_step4_page.dart` (linhas 295/404/520/924). Ou seja, o bug original também cobraria o valor errado de verdade, não só exibiria errado.
- **Fix aplicado:**
  1. Nova função Postgres `get_valor_consulta_padrao()` (`SECURITY DEFINER`, `GRANT EXECUTE` para `authenticated`) — necessária porque a RLS de `configuracoes_sistema` restringe `SELECT` a admin/super_admin; a RPC expõe só o valor de preço sem abrir a tabela inteira (que também tem dados de config de remetente/CEP do Melhor Envio).
  2. Novo `ConfiguracoesService.getValorConsultaPadrao()` no Flutter, chamando a RPC.
  3. Todas as 8 telas de UI passaram a usar o valor dinâmico via `_loadValorConsulta()`/`setState`.
  4. `NewConsultationStep1Page._goToNextStep()` agora popula `NewConsultationFormData(consultationValue: _valorConsulta)` com o valor real carregado; os demais steps (`health-history`, `step2`, `step3`) propagam esse valor via `copyWith` (que só sobrescreve campos explicitamente passados) até chegar ao `step4` (pagamento) — corrigindo também o valor de cobrança real, não só o texto exibido.
- **Verificação:** `flutter analyze` limpo em todos os arquivos tocados; nenhuma ocorrência remanescente de `200,00`/`89,90` no código (`grep` confirmado). Validado ao vivo: etapas 1/2 do paciente e as 3 etapas do médico mostram "R$ 99,90" corretamente.
- **Ref.:** PAC-15 em `02-paciente-mobile.md`, ADM-20 em `04-admin-web.md`

### REG-11 — Upload de documentos quebrado no cadastro de médico (web) — ✅ CORRIGIDO
- **Severidade:** Crítica
- **Ambiente:** Médico mobile (Flutter web) — `/professional-validation/step2-documents`
- **Descrição:** ao selecionar um arquivo para qualquer um dos uploads (RG/CNH, comprovante de residência, CRM/CRO, diploma), o app lançava uma exceção JS não tratada e o arquivo nunca era anexado — bloqueando toda a validação profissional do médico.
- **Erro no console (antes do fix):**
  ```
  DartError: On web `path` is unavailable and accessing it causes this exception.
  You should access `bytes` property instead
  ```
- **Causa raiz:** `step2_documents_page.dart` acessava `PlatformFile.path` do pacote `file_picker` — propriedade inexistente no target web (só mobile/desktop nativo).
- **Evidência de impacto real:** as 3 "solicitações de novos médicos" já existentes no banco de dev (Emerson Medico, Dr. Gustavo Henrique Martins, Dra. Vanessa Lima Souza) estavam todas travadas em "Etapa de validação 1 de 3" — exatamente o padrão que esse bug produz.
- **Fix aplicado:** `FilePicker.platform.pickFiles(withData: true)` (em vez de depender de `.path`) + novo método `ImageStorageService.uploadDocumentBytes()` que sobe o `Uint8List` direto via `uploadBinary`. Estado local trocado de `Map<String, File?>` para `Map<String, Uint8List?>` em `step2_documents_page.dart`.
- **Validado ao vivo:** upload real de 5 documentos (RG, comprovante residência, CRM/CRO, diploma, certificado) com uma médica de teste criada nesta sessão — todos salvaram com sucesso, sem erro de `.path`.
- **Ref.:** MED-02 em `03-medico-mobile.md`

### REG-12 — RLS de `pacientes` bloqueia médicos de verdade — ✅ CORRIGIDO
- **Severidade:** Crítica
- **Ambiente:** Médico mobile — `/appointment/live/:id` (consulta em tempo real), e potencialmente qualquer tela que faça join médico→paciente
- **Descrição:** ao clicar "Iniciar atendimento" numa consulta assumida da fila, a tela de consulta ao vivo mostra:
  ```
  Erro ao carregar consulta: PostgrestException(message: Cannot coerce the result to a
  single JSON object, code: PGRST116, details: The result contains 0 rows, hint: null)
  ```
  mesmo com a consulta existindo, com status `em_andamento` e `medico_id` corretamente atribuído ao médico logado (confirmado via SQL direto).
- **Causa raiz confirmada (via `pg_policies`):** a query em `live_consultation_page.dart:83-97` faz `.from('consultas').select('..., pacientes!inner(..., profiles!inner(...))').eq('id', ...).single()`. A policy de RLS SELECT em `pacientes`, chamada **"Medicos and Admins can view pacientes"**, na verdade só verifica:
  ```sql
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  ```
  — **nunca checa se o usuário é médico** (`medicos.user_id = auth.uid()` ou similar). Como o médico de teste não é admin, o RLS barra a leitura de `pacientes`, o `inner join` elimina a linha inteira, e `.single()` recebe 0 linhas.
- **Impacto:** **todo médico real fica impedido de abrir a tela de atendimento ao vivo** de qualquer consulta — a política tem o nome certo mas a implementação errada. Isso provavelmente afeta outras telas que dependam do mesmo padrão de join (prontuário, prescrição, financeiro) — vale auditar.
- **Verificação:** `select policyname, cmd, qual from pg_policies where tablename='pacientes'` mostrava a `qual` da policy sem nenhuma referência a `medicos`.
- **Fix aplicado:** duas migrations — `fix_medicos_can_view_pacientes_policy` (policy de `pacientes` passa a checar `EXISTS (SELECT 1 FROM medicos WHERE medicos.user_id = auth.uid())`) e `fix_medicos_can_view_paciente_profiles_v2` (a policy de `profiles`, também no caminho do `inner join`, precisou do mesmo tratamento — v1 tentou filtrar por `tipo_usuario='paciente'`, mas um paciente de seed tinha `tipo_usuario` inconsistente; v2 usa `EXISTS (SELECT 1 FROM pacientes WHERE pacientes.user_id = profiles.id)` em vez de confiar no campo denormalizado).
- **Validado ao vivo (2 vezes, com 2 médicos e 2 consultas diferentes):** tela de atendimento ao vivo carrega normalmente, sem erro de RLS/"0 rows".
- **Ref.:** MED-08/09 em `03-medico-mobile.md`

### REG-13 — Upload em "Autorização Anvisa" (admin) sem controle visível + sem policy de Storage — ✅ CORRIGIDO (policy de Storage)
- **Severidade:** Crítica
- **Ambiente:** Admin web — modal "Autorização Anvisa" em `/pedidos/:id`
- **Descrição (dois bugs empilhados no mesmo fluxo):**
  1. **Sem controle de upload visível:** o modal mostra o texto "Adicione o arquivo da solicitação abaixo" mas **nenhum botão/dropzone aparece** — existe um `<input type="file">` no DOM, porém com `style="display: none"` e computed `display: none`, sem nenhum `label`/botão irmão que o acione. Sem inspecionar o DOM (o que um usuário não pode fazer), é **impossível anexar o arquivo**, e o botão "Finalizar" permanece desabilitado para sempre.
  2. **Mesmo forçando a interação** (destravei o CSS via DevTools só para continuar o teste) **e selecionando um arquivo válido, o upload falha:**
     ```
     POST .../storage/v1/object/documents/pedido_anvisa/<pedido_id>/autorizacao_<ts>.pdf → 400
     {"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy"}
     ```
     A falha é **silenciosa** — o modal permanece aberto sem nenhuma mensagem de erro.
- **Causa raiz confirmada (via `pg_policies` no schema `storage`):** o bucket `documents` tem policies de INSERT apenas para os prefixos de pasta `medico_docs`, `paciente_docs` e `order_docs`. **Não existe nenhuma policy de INSERT para o prefixo `pedido_anvisa`** — nem para admin, nem para ninguém. A feature inteira de "registrar autorização ANVISA no pedido" (ADM-13, `admin_registrar_anvisa` no fluxo documentado) está sem a permissão de Storage correspondente.
- **Impacto:** nenhum admin consegue de fato anexar o comprovante de autorização/recusa da ANVISA a um pedido — a funcionalidade documentada em ADM-13 é inoperante tanto pela UI quanto pelo backend.
- **Fix aplicado (parte 2 — policy de Storage):** migration `add_storage_policy_pedido_anvisa` adiciona policies `INSERT`/`UPDATE`/`DELETE` para `bucket_id='documents' AND (storage.foldername(name))[1] = 'pedido_anvisa'`, restritas a admin/super_admin. **Validado ao vivo:** upload de PDF de teste via modal "Autorização Anvisa" concluído com sucesso, nova linha confirmada em `storage.objects`.
- **Pendente (parte 1 — UI):** o problema do controle de upload sem label/botão visível associado ao `<input type="file">` **não foi corrigido nesta rodada** — segue como pendência de UI/UX no modal de `/pedidos/:id`.
- **Ref.:** ADM-13 em `04-admin-web.md`

### REG-20 — Chat da consulta falha silenciosamente em consulta com data retroativa (reavaliado, sem causa raiz de código confirmada)
- **Severidade:** Média → provavelmente artefato de teste, rebaixado
- **Ambiente:** Médico mobile — tela de atendimento ao vivo (`/appointment/live/:id`)
- **Descrição:** ao testar o chat em duas consultas diferentes, a primeira (agendada para data atual) funcionou normalmente — mensagem enviada, persistida em `chat_mensagens`, aparece na UI em tempo real. Na segunda (consulta que veio do fluxo "assumir da fila", com data/hora de agendamento **retroativa**, 02/02/2026), o envio de mensagem falhou silenciosamente: o campo de texto é limpo (parece que enviou) mas **nenhuma linha é criada em `chat_mensagens`** e nada aparece no chat — sem nenhum erro no console.
- **Investigação (esta rodada):** revisão completa da cadeia envolvida — `ChatService.sendMessage()` faz um `insert` simples sem nenhuma condição de data; as 3 policies de RLS em `chat_mensagens` (`INSERT`/`UPDATE`/`SELECT`) dependem apenas de `is_consulta_participant(consulta_id)`, cuja implementação (`pg_proc`) verifica somente se o usuário é o paciente ou médico da consulta — nenhuma delas referencia data/hora ou status. Além disso, `live_consultation_page.dart:_sendMessage()` **já exibe um SnackBar de erro visível** quando `sendMessage` retorna falha — o que contradiz a descrição original de "falha silenciosa, sem erro no console". A consulta usada no teste original (`6acd86e2-...`) está hoje com `status='finalizada'` — não foi possível confirmar se já estava nesse status no momento exato do teste anterior.
- **Conclusão:** não foi encontrada nenhuma causa de código (RLS, validação client-side, condição de data) que explique o comportamento relatado. É provável que tenha sido um artefato do teste anterior (ex. a consulta já estar finalizada, ou um erro de rede transitório do Playwright) em vez de um bug real do app.
- **Ação recomendada:** reobservar em um teste manual real, se o comportamento se repetir; caso contrário, não requer ação.
- **Ref.:** MED-09 em `03-medico-mobile.md`

### REG-21 — Listas de consultas do médico não atualizam após finalizar atendimento (reavaliado, sem correção de código necessária)
- **Severidade:** Baixa (cosmético)
- **Ambiente:** Médico mobile — `/appointment` (abas "Próximas consultas" e "Histórico")
- **Descrição original:** após finalizar um atendimento (MED-12) com sucesso, a lista mostrou o estado antigo até um reload manual.
- **Investigação (esta rodada):** `finish_appointment_page.dart:_finalizar()` só chama `context.go('/appointment')` **depois** que `await _medicoService.finalizarAtendimento(...)` já retornou com sucesso — ou seja, o `UPDATE` no banco (confirmado via `medico_finalizar_atendimento`, uma RPC síncrona sem cache) já está commitado antes da navegação ocorrer. A rota `/appointment` é um `GoRoute` comum (não `StatefulShellRoute`), então `context.go` deveria recriar o `State` de `AppointmentsPage` do zero e disparar `_load()` novamente em `initState`. Não foi encontrada nenhuma causa de código (cache, race, lógica de filtro) que explique o comportamento relatado.
- **Conclusão:** não foi possível confirmar uma causa raiz de código para este comportamento; é possível que tenha sido um artefato do ambiente de teste anterior (timing de renderização do Playwright/CanvasKit). A tela já tem `RefreshIndicator` (pull-to-refresh) como mitigação caso o problema seja real e intermitente. Recomenda-se apenas reobservar em um teste manual real antes de investir mais tempo aqui.
- **Ref.:** MED-12 em `03-medico-mobile.md`

### REG-22 — FALSO POSITIVO: `/home` já tem guarda de papel (redirect existente, não reproduzido no fluxo atual)
- **Severidade:** N/A — não é um bug
- **Ambiente:** Mobile — `home_page.dart` / roteador
- **Descrição original:** ao navegar para `/home` como paciente, a tela teria renderizado o shell de médico antes de redirecionar.
- **Investigação (esta rodada):** `home_page.dart:_loadUserData()` (linhas 88-93) já checa `isMedico` via `getMedicoByCurrentUser()` e chama `context.go('/patient/home')` imediatamente se o usuário não for médico — esse código já existe desde antes desta sessão de testes (`git log` mostra commits anteriores tocando este arquivo, sem relação com os fixes de hoje). O comportamento observado pelo agente de teste anterior foi provavelmente apenas o instante de loading (`_loading=true`, tela em branco/spinner) antes do redirect assíncrono completar — não uma falha de guarda.
- **Conclusão:** nenhuma correção necessária. A guarda de papel já existe e funciona; SEC-08 (deep-link cross-papel sem guarda dedicada em rotas que não fazem essa checagem) continua válido como observação geral, mas não se aplica a `/home` especificamente.
- **Ref.:** SEC-08 em `06-permissoes-rls.md`

### REG-26 — FALSO POSITIVO: `/register?type=medico` não é uma rota real do app
- **Severidade:** N/A — não é um bug
- **Ambiente:** Mobile — `register_page.dart` / roteamento de cadastro
- **Descrição original:** um teste anterior navegou manualmente para `/register?type=medico` e observou que o cadastro caiu em paciente comum em vez de médico.
- **Investigação (esta rodada):** o valor correto usado pela UI real é `type=doctor`, não `type=medico` — confirmado em `user_selection_page.dart:136,142` (`context.go('/register?type=patient')` / `context.go('/register?type=doctor')`) e em `register_page.dart:80` (`_isDoctor = widget.userType == 'doctor'`). O parâmetro `medico` nunca é produzido por nenhum caminho de UI do app — o teste anterior usou uma URL que não existe no fluxo real, então o "bug" era do próprio teste (URL inventada), não do código.
- **Conclusão:** nenhuma correção necessária. O fluxo real (`/register?type=doctor`, alcançado pela tela de seleção de usuário) funciona corretamente.
- **Ref.:** MED-01 em `03-medico-mobile.md`

### REG-14 — App mobile não tinha tela de notificações — ✅ JÁ IMPLEMENTADO (confirmado nesta rodada)
- **Severidade:** Alta (era)
- **Ambiente:** Paciente mobile e Médico mobile
- **Descrição original:** notificação personalizada criada pelo admin (ADM-18) não tinha nenhum consumidor in-app no mobile — sem sino, sem rota, sem inbox.
- **Investigação (esta rodada):** ao reinvestigar para corrigir, encontrado que a feature **já existe e está completa**: `NotificationsBellButton` (sino com badge de contagem não lida, `notifications_bell_button.dart`) presente tanto em `home_page.dart` (médico) quanto `patient_home_page.dart` (paciente); rota `/notifications` registrada no router; `NotificationsPage` com listagem, marcar-como-lida individual e "marcar todas como lidas"; `NotificacoesService` com `getUnreadCount`/`getNotificacoes`/`markAsRead`/`markAllAsRead`. Tudo isso foi implementado num commit anterior a esta sessão de testes (`f57522f`, "adicionar página de notificações e botão de sino com contagem de não lidas") — o achado original (`08-regressao-bugs.md` de uma sessão anterior) estava desatualizado.
- **Verificação:** `flutter analyze` limpo nos 3 arquivos (sino, página, service).
- **Conclusão:** nenhuma correção necessária — feature já implementada e funcional.
- **Validado ao vivo:** notificação de teste inserida via SQL → sino mostrou badge "1" → clique navegou para `/notifications` → notificação apareceu com título/descrição corretos → clique marcou `lida=true`/`lida_em` preenchido → badge desapareceu ao voltar para a home. Fluxo completo confirmado, nenhum erro de console.
- **Ref.:** E2E-04 em `05-fluxos-cross.md`, PAC-08

### REG-10 — Associações/marcas duplicadas no banco (dado de seed)
- **Severidade:** Baixa (higiene de dados, não bug de código)
- **Ambiente:** Admin web + Paciente/Médico mobile (catálogo)
- **Descrição:** 8 nomes de associações estão duplicados em `associacoes_marcas` (2 linhas cada): VitaCann Medicamentos, Green Hope Pharma, Associação de Apoio à Pesquisa e Pacientes de Cannabis, Associação Brasileira de Pacientes de Cannabis Medicinal, Cannativa Farmacêutica, Associação Medicinal do Sul, Associação de Pacientes Nordeste Cannabis, BioCanabis Brasil. Confirmado via `select nome, count(*) from associacoes_marcas group by nome having count(*) > 1`.
- **Impacto:** UX confusa no formulário "Associações e marcas vinculadas" ao cadastrar produto (ADM-08) — usuário vê a mesma associação duas vezes e não sabe qual escolher.
- **Ação recomendada:** deduplicar os dados de seed; se forem intencionalmente entidades distintas (matriz/filial?), renomear para diferenciar.
- **Ref.:** ADM-08 em `04-admin-web.md`
