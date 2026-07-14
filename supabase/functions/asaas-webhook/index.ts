import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Webhook do Asaas: recebe eventos de cobrança (PAYMENT_RECEIVED, PAYMENT_CONFIRMED, etc.)
 * e atualiza asaas_payments + pedidos/consultas conforme reference_type/reference_id.
 *
 * IMPORTANTE: Esta função deve ser implantada com verify_jwt: false, pois o Asaas
 * chama a URL diretamente (não envia JWT). Use ASAAS_WEBHOOK_ACCESS_TOKEN e valide
 * o header asaas-access-token ao configurar o webhook no Asaas.
 *
 * Documentação: https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
 */

const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_ACCESS_TOKEN");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, asaas-access-token",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Validação opcional: token configurado no Asaas (header asaas-access-token)
  if (WEBHOOK_TOKEN && WEBHOOK_TOKEN.length > 0) {
    const token = req.headers.get("asaas-access-token");
    if (token !== WEBHOOK_TOKEN) {
      return jsonResponse({ error: "Invalid webhook token" }, 401);
    }
  }

  let body: { event?: string; payment?: { id?: string; status?: string; [k: string]: unknown } };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const event = body.event;
  const payment = body.payment;
  if (!event || !payment) {
    return jsonResponse({ error: "event and payment required" }, 400);
  }

  const paymentId = payment.id ?? (payment as { object?: { id?: string } }).object?.id;
  const paymentStatus = payment.status ?? (payment as { object?: { status?: string } }).object?.status;

  // Responde 200 o mais rápido possível (Asaas recomenda para não pausar a fila)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (paymentId) {
      const { data: row } = await supabase
        .from("asaas_payments")
        .select("id, reference_type, reference_id")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();

      if (row) {
        await supabase
          .from("asaas_payments")
          .update({
            status: paymentStatus ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("asaas_payment_id", paymentId);

        const refType = (row.reference_type as string)?.toLowerCase();
        const refId = row.reference_id as string | null;

        // Pagamento confirmado/recebido: atualiza pedido ou consulta
        if (
          refId &&
          (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")
        ) {
          if (refType === "order") {
            await supabase
              .from("pedidos")
              .update({ status: "aprovado", updated_at: new Date().toISOString() })
              .eq("id", refId);
            try {
              await supabase.from("pedido_historico").insert({
                pedido_id: refId,
                status_anterior: "pendente",
                status_novo: "aprovado",
              });
            } catch {
              // pedido_historico pode não existir ou ter schema diferente; ignorar
            }
          }
          // Consultas já nascem com status='agendada' no momento do agendamento
          // (antes mesmo do pagamento ser confirmado). O enum status_consulta só
          // aceita agendada/em_andamento/finalizada/cancelada — não existe um
          // valor "confirmada" para representar "pagamento ok, aguardando
          // atendimento". Por isso não fazemos nenhum UPDATE de status aqui para
          // refType === "consultation": a consulta permanece "agendada" (correto)
          // até o médico iniciar o atendimento (em_andamento).
        }
      }
    }
  } catch (e) {
    console.error("asaas-webhook processing error:", e);
    // Mesmo em erro, retornamos 200 para o Asaas não reenviar em loop
    return jsonResponse({ received: true, error: String(e) });
  }

  return jsonResponse({ received: true });
});
