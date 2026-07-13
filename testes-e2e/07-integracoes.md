# Integrações / Webhooks (INT-*)

### INT-04/05/06 — Asaas (pagamento) — BLOQUEADO
- **Status:** ❌ **falhou** na primeira etapa (`asaas-sync-customer`) — ver REG-08. A chamada CORS-preflight rejeita o header `x-client-info` (enviado pelo SDK `supabase_flutter` em toda requisição a Edge Functions), então nenhuma tentativa de pagamento (PIX/cartão/boleto) chega a completar quando testada via navegador. `asaas-create-payment` e `asaas-webhook` não puderam ser exercitados nesta rodada porque o fluxo nunca chega lá.
- **Ressalva:** CORS é uma restrição exclusiva de navegador — não sabemos se builds nativos (Android/iOS) do app sofrem do mesmo problema; só foi possível testar via Flutter web nesta sessão. Mas o fix (adicionar `x-client-info, apikey` ao `Access-Control-Allow-Headers`) é necessário de qualquer forma para qualquer cliente web (incluindo uma futura versão web "oficial" do app).

### INT-08 — Config do Asaas (sandbox)
- **Status:** ✅ confirmado — `ASAAS_BASE_URL` na função `asaas-sync-customer` usa `https://api-sandbox.asaas.com/v3` como padrão. Ambiente de teste seguro.

### INT-01/02/03 — Melhor Envio — não testado nesta rodada
- **INT-01 (cotação):** não testado — o fluxo de pedido do paciente que chegaria à cotação de frete está bloqueado por REG-08 (pagamento)
- **INT-02 (checkout/etiqueta):** não testado — testei apenas a atualização manual de status "Em separação" (ADM-15), que **não** aciona a integração real do Melhor Envio (é um formulário manual de status/rastreio, distinto do botão de gerar etiqueta real documentado no levantamento original — não encontrei um botão "Gerar etiqueta Melhor Envio" separado na tela de detalhe do pedido testada; pode estar em outro estado do pedido ou ter sido substituído pelo formulário manual)
- **INT-03 (webhook):** não testado — exigiria disparar um evento real do Melhor Envio ou simular a chamada ao endpoint público `melhor-envio-webhook`

### INT-07 — DocuSign — não testado
- Não cheguei à etapa de procuração (`/patient/orders/new/procuracao`) porque a criação de pedido do zero depende do fluxo de consulta/receita, bloqueado por REG-08.

---

## Resumo

Das 8 integrações listadas no inventário original, só foi possível **confirmar a configuração de sandbox do Asaas (INT-08)** e **identificar a causa raiz exata da falha em INT-04/05/06 (REG-08)**. As demais (Melhor Envio, DocuSign) ficaram fora do alcance desta rodada porque dependem de o pagamento funcionar primeiro para se chegar a essas etapas do fluxo do paciente. Recomenda-se corrigir REG-08 antes da próxima rodada de testes de integração.
