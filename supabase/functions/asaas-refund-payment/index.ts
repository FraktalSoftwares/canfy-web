import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cancela (se ainda PENDING) ou reembolsa (se já RECEIVED/CONFIRMED) uma cobrança
 * Asaas vinculada a um pedido ou consulta, e reflete o resultado em asaas_payments.
 *
 * Autorização: o próprio dono do pagamento (paciente) OU admin/super_admin podem
 * acionar o reembolso — cobre tanto "paciente cancela consulta com >12h de
 * antecedência" quanto "admin recusa pedido". Também aceita chamadas
 * server-to-server (header x-cron-secret == CRON_DISPATCH_SECRET) para o
 * reembolso automático disparado pelo motor de fila de prioridade
 * (public.expirar_consulta_sem_medico via pg_net) quando nenhum médico aceita
 * a consulta a tempo — nesse caso não há usuário logado para validar.
 */

const CRON_DISPATCH_SECRET = Deno.env.get("CRON_DISPATCH_SECRET");

/**
 * Sem valor padrão de propósito: com o fallback anterior para sandbox, um
 * ambiente de produção sem ASAAS_BASE_URL tentaria estornar no sandbox e o
 * dinheiro do paciente jamais voltaria — silenciosamente.
 */
function envObrigatoria(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor || valor.trim() === "") {
    throw new Error(`Variável de ambiente ${nome} não configurada.`);
  }
  return valor;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  let ASAAS_BASE: string;
  let ASAAS_KEY: string;
  let SUPABASE_URL: string;
  let SERVICE_KEY: string;
  try {
    ASAAS_BASE = envObrigatoria("ASAAS_BASE_URL").replace(/\/+$/, "");
    ASAAS_KEY = envObrigatoria("ASAAS_API_KEY");
    SUPABASE_URL = envObrigatoria("SUPABASE_URL");
    SERVICE_KEY = envObrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Chamada de sistema (cron -> pg_net -> aqui): autoriza via segredo
    // compartilhado em vez de JWT de usuário, já que não há usuário logado.
    const cronSecret = req.headers.get("x-cron-secret");
    const isSystemCall = !!CRON_DISPATCH_SECRET && cronSecret === CRON_DISPATCH_SECRET;

    let isAdmin = false;
    let userId: string | null = null;

    if (!isSystemCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return jsonResponse({ error: "Invalid token" }, 401);
      }
      userId = user.id;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    }

    const body = await req.json().catch(() => ({})) as { asaas_payment_id?: string };
    const { asaas_payment_id } = body;
    if (!asaas_payment_id) {
      return jsonResponse({ error: "asaas_payment_id is required" }, 400);
    }

    const { data: paymentRow, error: paymentError } = await supabase
      .from("asaas_payments")
      .select("id, user_id, status, asaas_payment_id")
      .eq("asaas_payment_id", asaas_payment_id)
      .maybeSingle();
    if (paymentError || !paymentRow) {
      return jsonResponse({ error: "Payment not found" }, 404);
    }

    const isOwner = userId !== null && paymentRow.user_id === userId;
    if (!isSystemCall && !isAdmin && !isOwner) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const currentStatus = (paymentRow.status ?? "").toUpperCase();
    let asaasResult: unknown;
    let newStatus: string;

    if (currentStatus === "RECEIVED" || currentStatus === "CONFIRMED") {
      const refundRes = await fetch(`${ASAAS_BASE}/payments/${asaas_payment_id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": ASAAS_KEY },
      });
      const refundData = await refundRes.json().catch(() => ({}));
      if (!refundRes.ok) {
        return jsonResponse({ error: "Asaas refund error", details: refundData }, refundRes.status);
      }
      asaasResult = refundData;
      newStatus = "REFUNDED";
    } else if (currentStatus === "PENDING") {
      const deleteRes = await fetch(`${ASAAS_BASE}/payments/${asaas_payment_id}`, {
        method: "DELETE",
        headers: { "access_token": ASAAS_KEY },
      });
      const deleteData = await deleteRes.json().catch(() => ({}));
      if (!deleteRes.ok) {
        return jsonResponse({ error: "Asaas cancel error", details: deleteData }, deleteRes.status);
      }
      asaasResult = deleteData;
      newStatus = "CANCELLED";
    } else {
      return jsonResponse(
        { error: `Payment status '${currentStatus}' cannot be refunded or cancelled` },
        409,
      );
    }

    await supabase
      .from("asaas_payments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("asaas_payment_id", asaas_payment_id);

    return jsonResponse({ success: true, status: newStatus, asaas: asaasResult }, 200);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
