# Regressão de bugs/riscos (REG-*)

Casos derivados do levantamento original **mais os achados reais** encontrados durante a execução dos roteiros de UAT em 2026-07-10.

> **Atualização 2026-07-10 (rodada de correções):** REG-08, REG-09, REG-11, REG-12, REG-13, REG-15, REG-17, REG-18 e REG-19 foram corrigidos nesta sessão (código + migrations + deploy de edge functions + rotação de secret pelo usuário) e revalidados ao vivo. REG-23 (RLS de `paciente_anamnese`) e REG-24 (upload `.path` quebrado em mais 3 telas) foram encontrados ao fechar E2E-01/E2E-02 e corrigidos na mesma sessão. Com todos esses fixes, **E2E-01 (jornada clínica) e E2E-02 (jornada comercial) foram validados de ponta a ponta pela primeira vez**, incluindo pagamento PIX real e cotação de frete real via Melhor Envio.
>
> **Atualização 2026-07-13 (segunda rodada de correções):** REG-21 e REG-22 corrigidos e confirmados ao vivo. REG-24 (item pendente do crop de foto de perfil) corrigido. REG-13 parte 1 (suposto botão de upload sem controle visível) foi reinvestigado e é **falso positivo** — o código já tinha o botão correto; o achado original da sessão anterior provavelmente inspecionou o `<input type="file">` escondido em vez do `<button>` visível que o aciona. REG-20 foi reproduzido de forma direcionada (mesma consulta do relatório original) e **não se repetiu** — mensagem enviada, apareceu na UI e persistiu no banco normalmente; classificado como transitório da sessão de teste anterior, não um bug de código. Pendente: apenas REG-14 (feature de notificações in-app, decisão de produto).

### REG-24 — Upload de arquivo via `.path` quebrado em mais 3 telas do Flutter Web (mesmo padrão do REG-11) — ✅ CORRIGIDO
- **Severidade:** Crítica (bloqueava a Etapa 3 do fluxo de novo pedido) / Média (edição de foto/documento de perfil, fora do caminho crítico)
- **Ambiente:** Paciente mobile — `/patient/orders/new/step3` (upload de documentos do pedido); Médico/Paciente mobile — `basic_data_page.dart` (editar foto de perfil, editar documento do médico)
- **Descrição:** o mesmo bug do REG-11 (`file_picker`'s `PlatformFile.path` é `null` no Flutter Web) reapareceu em 3 lugares não cobertos pelo fix original:
  1. `new_order_step3_page.dart` — upload de RG/CNH, comprovante de residência, autorização Anvisa, documento complementar e laudo médico na Etapa 3 do fluxo de novo pedido. Bloqueava **toda** a jornada comercial (E2E-02) a partir dessa etapa.
  2. `basic_data_page.dart:_editarDocumento()` — reenvio de documento já aprovado do médico (usava `File(result.files.single.path!)` diretamente).
  3. `basic_data_page.dart:_editarFoto()` — troca de foto de perfil via `image_picker`, que no Flutter Web retorna `XFile.path` como uma blob URL (não um caminho de filesystem real), tornando `File(picked.path)` inválido.
- **Fix aplicado:**
  - `new_order_step3_page.dart`: os 5 campos de arquivo (`File?`) foram trocados por uma classe local `_PickedDoc` (bytes + nome + content-type derivado da extensão); `_pickFromGallery()` agora usa `withData: true`; todos os uploads passaram a chamar `ImageStorageService.uploadDocumentBytes()` em vez de `uploadDocument(File)`.
  - `basic_data_page.dart`: `_editarDocumento()` também migrado para `pickFiles(withData: true)` + `uploadDocumentBytes()`.
  - Novo método `ImageStorageService.uploadImageBytes()` (análogo ao `uploadDocumentBytes` já existente) para o caso de imagens via `image_picker`; `_editarFoto()` agora usa `picked.readAsBytes()` (API do `XFile`, funciona em web) em vez de `File(picked.path)`.
  - `step1_professional_data_page.dart` (item concluído em 2026-07-13): a tela de "ajuste de foto" do cadastro de médico (`_showImageAdjustmentSheet`) também usava `File(pickedFile.path)` para preview via `Image.file`. Os controles de zoom (`+`/`−`) já eram `onPressed: () {}` (no-op, puramente decorativos) — não havia crop real aplicado, o que simplificou o fix: campo de estado trocado de `File?` para `Uint8List?`, `_pickImage()` agora lê `pickedFile.readAsBytes()`, e o preview passou de `Image.file` para `Image.memory`.
- **Verificação:** `flutter analyze` limpo em todos os arquivos tocados; varredura `grep` por `FilePicker.platform.pickFiles`/`.single.path`/`File(...path)` em todo o projeto não encontra mais nenhuma ocorrência do padrão problemático.
- **Validado ao vivo:** upload real dos 5 documentos na Etapa 3 do pedido, 0 erros de console, todos confirmados persistidos em `storage.objects` (bucket `documents`, prefixo `order_docs/`) e na tabela `documentos`, vinculados ao pedido `CAN-1783944826102`.
- **Ref.:** E2E-02 em `05-fluxos-cross.md`, PAC-28+ em `02-paciente-mobile.md`

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
- **Reinvestigação da parte 1 (UI) — FALSO POSITIVO:** revisitando `PedidoDetalhes.tsx:877-895`, o `<input type="file" className="hidden">` **já tem** um `<button onClick={() => anvisaInputRef.current?.click()}>` associado, visível e estilizado ("Clique para adicionar o arquivo", ícone `UploadCloud`, borda dashed), condicionado apenas a `anvisaDecisao === "aprovada"` (escolha de rádio anterior no mesmo modal). O achado original da sessão anterior provavelmente inspecionou o `<input>` escondido antes de selecionar "aprovada", ou confundiu o alvo do teste automatizado com o único ponto de interação. Não há bug de UI real aqui — nenhum código foi alterado.
- **Ref.:** ADM-13 em `04-admin-web.md`

### REG-20 — Chat da consulta falhou silenciosamente em consulta com data retroativa — ⬜ NÃO REPRODUZIU (provável transitório)
- **Severidade:** Média
- **Ambiente:** Médico mobile — tela de atendimento ao vivo (`/appointment/live/:id`)
- **Descrição original:** numa sessão de teste anterior, enviar uma mensagem de chat na consulta `3afc28b4-68bc-4e3f-a804-1a6dfa3a2cd0` (data de agendamento retroativa, 02/02/2026) falhou silenciosamente — campo limpava mas nenhuma linha aparecia em `chat_mensagens`.
- **Investigação (2026-07-13):**
  1. Revisão de `chat_service.dart`: `sendMessage()` não tem nenhuma lógica condicionada a data/hora da consulta; erros de exceção retornam `{success: false, message: ...}` (não são engolidos silenciosamente) e a UI (`live_consultation_page.dart:_sendMessage()`) já exibe um `SnackBar` de erro nesse caso.
  2. Revisão das RLS de `chat_mensagens` (`pg_policies`): a policy de `INSERT` usa `is_consulta_participant(consulta_id)`, uma função `SECURITY DEFINER` que só checa `medico_id`/`paciente_id` batendo com `auth.uid()` — **sem nenhuma referência a data/hora**.
  3. Teste direto via SQL (`set local role authenticated` + JWT do médico da consulta) confirmou que o `INSERT` funciona normalmente para essa consulta específica.
  4. Confirmado que `chat_mensagens` está na publicação `supabase_realtime`.
  5. Reprodução direcionada ao vivo (mesmo médico, mesma consulta exata): mensagem de teste enviada, apareceu imediatamente na UI, persistida no banco (`POST .../chat_mensagens` → 201), zero erros de console.
- **Conclusão:** nem o backend (RLS, realtime) nem a lógica do client têm qualquer dependência de data/hora que explicasse o bug relatado. Classificado como **falha transitória da sessão de teste anterior** (rede, timing, ou estado momentâneo da subscription realtime) — não um bug de código reproduzível. Nenhuma mudança de código foi necessária.
- **Ref.:** MED-09 em `03-medico-mobile.md`

### REG-21 — Listas de consultas do médico não atualizavam após finalizar atendimento — ✅ CORRIGIDO
- **Severidade:** Baixa (cosmético)
- **Ambiente:** Médico mobile — `/appointment` (abas "Próximas consultas" e "Histórico")
- **Descrição:** após finalizar um atendimento (MED-12), a aba "Próximas consultas" continuava mostrando a consulta finalizada com o estado antigo, e a aba "Histórico" só refletia a mudança após reload manual da página (F5). O dado no backend sempre esteve correto (`status='finalizada'`) — o bug era puramente de estado local desatualizado.
- **Causa raiz confirmada:** `AppointmentsPage` carrega a lista apenas em `initState()` (chamando `_load()`); como o GoRouter mantém essa página viva na pilha de navegação (é uma rota de nível superior), `context.go('/appointment')` ao voltar de `FinishAppointmentPage` não recria o widget nem dispara `initState()` de novo — não havia nenhum mecanismo para reagir a "esta tela voltou a ficar visível".
- **Fix aplicado:** registrado um `RouteObserver<PageRoute<void>>` global no `GoRouter` (`app_router.dart`, `observers: [routeObserver]`), e `AppointmentsPage` passou a usar o mixin `RouteAware`, se inscrevendo no observer (`didChangeDependencies`) e implementando `didPopNext()` para chamar `_load()` sempre que uma rota empilhada por cima (finalizar atendimento, pré-consulta, etc.) é fechada e esta tela volta ao topo da pilha.
- **Validado ao vivo:** fluxo completo (iniciar atendimento → chat → prescrever → emitir receita → finalizar) seguido de retorno via navegação SPA (sem F5) para `/appointment` — lista já apareceu atualizada (consulta some de "Próximas", aparece em "Histórico" como "Realizada") sem qualquer reload manual.
- **Ref.:** MED-12 em `03-medico-mobile.md`

### REG-22 — Rota `/home` (médico) acessível por paciente sem guarda de papel — ✅ CORRIGIDO
- **Severidade:** Baixa
- **Ambiente:** Mobile — `HomePage` (médico) e `PatientHomePage`
- **Descrição:** ao navegar manualmente para `/home` (dashboard do médico) estando logado como paciente, a tela renderizava o shell do médico normalmente (sem vazamento de dado — RLS zera os contadores por falta de linha em `medicos` — mas a tela não deveria nem abrir). O caso inverso (médico acessando `/patient/home`) tinha o mesmo problema simétrico.
- **Causa raiz confirmada:** nenhuma das duas telas checava o papel do usuário antes de renderizar — `HomePage._loadUserData()` só verificava se havia dados de médico para preencher a UI, sem redirecionar quando não havia; `PatientHomePage._loadData()` tinha o mesmo padrão para dados de paciente.
- **Fix aplicado:** `HomePage._loadUserData()` agora checa `medicoResult['success'] && medicoResult['data'] != null` logo no início e chama `context.go('/patient/home')` caso o usuário não seja médico. `PatientHomePage._loadData()` faz o inverso: checa se `getCurrentPatient()` retornou uma linha em `pacientes` (não só o `profile`) e chama `context.go('/home')` caso contrário.
- **Validado ao vivo (ambas as direções):** paciente navegando para `/home` foi redirecionado automaticamente para `/patient/home`; médico navegando para `/patient/home` foi redirecionado automaticamente para `/home`. Confirmado via log do GoRouter (`going to /patient/home` / `going to /home`), zero erros de console.
- **Ref.:** SEC-08 em `06-permissoes-rls.md`

### REG-14 — App mobile não tem tela de notificações (feature incompleta)
- **Severidade:** Alta
- **Ambiente:** Paciente mobile e (provavelmente) Médico mobile
- **Descrição:** enviei uma notificação personalizada real pelo admin (ADM-18, destinatário "Todos os pacientes", envio imediato) e confirmei que a linha foi criada corretamente em `notificacoes` (`destinatario_tipo='todos_pacientes'`, `lida=false`). Ao logar como o paciente-alvo e navegar pelo app, **não existe nenhum sino/ícone de notificações nem rota dedicada** em `lib/core/router/app_router.dart` — o paciente não tem como saber que a notificação existe dentro do app.
- **Verificação:** grep por `notificacoes`/`notifications` no router não retornou nenhuma rota.
- **Impacto:** E2E-04 (broadcast do admin → paciente/médico recebem in-app) está incompleto — o dado é criado e ficaria corretamente escopado por RLS, mas não há consumidor no mobile. Some com a promessa da tela de "Notificações" existente no admin web (que tem inbox completa) sem equivalente no app do usuário final.
- **Ação recomendada:** confirmar com produto se a notificação in-app no mobile está no roadmap ou se o canal pretendido é só e-mail (via `dispatch-notificacao`/Resend); se in-app é esperado, é uma feature faltante, não um bug de regressão.
- **Ref.:** E2E-04 em `05-fluxos-cross.md`, PAC-08 (preferências de notificação existem, mas a inbox não)

### REG-10 — Associações/marcas duplicadas no banco (dado de seed)
- **Severidade:** Baixa (higiene de dados, não bug de código)
- **Ambiente:** Admin web + Paciente/Médico mobile (catálogo)
- **Descrição:** 8 nomes de associações estão duplicados em `associacoes_marcas` (2 linhas cada): VitaCann Medicamentos, Green Hope Pharma, Associação de Apoio à Pesquisa e Pacientes de Cannabis, Associação Brasileira de Pacientes de Cannabis Medicinal, Cannativa Farmacêutica, Associação Medicinal do Sul, Associação de Pacientes Nordeste Cannabis, BioCanabis Brasil. Confirmado via `select nome, count(*) from associacoes_marcas group by nome having count(*) > 1`.
- **Impacto:** UX confusa no formulário "Associações e marcas vinculadas" ao cadastrar produto (ADM-08) — usuário vê a mesma associação duas vezes e não sabe qual escolher.
- **Ação recomendada:** deduplicar os dados de seed; se forem intencionalmente entidades distintas (matriz/filial?), renomear para diferenciar.
- **Ref.:** ADM-08 em `04-admin-web.md`
