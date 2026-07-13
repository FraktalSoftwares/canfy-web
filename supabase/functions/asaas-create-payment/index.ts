import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_BASE = Deno.env.get("ASAAS_BASE_URL") ?? "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toAsaasBillingType(method: string): string {
  const map: Record<string, string> = {
    credit_card: "CREDIT_CARD",
    debit_card: "DEBIT_CARD",
    pix: "PIX",
    boleto: "BOLETO",
  };
  return map[method] ?? "BOLETO";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;
    const body = await req.json().catch(() => ({})) as {
      asaas_customer_id?: string;
      value: number;
      billingType?: string;
      dueDate?: string;
      description?: string;
      reference_type?: string;
      reference_id?: string;
    };
    const { value, billingType, dueDate, description, reference_type, reference_id } = body;
    if (value == null || value <= 0) {
      return new Response(JSON.stringify({ error: "value is required and must be positive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ASAAS_KEY) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let asaasCustomerId = body.asaas_customer_id;
    if (!asaasCustomerId) {
      const { data: row } = await supabase.from("asaas_customers").select("asaas_customer_id").eq("user_id", userId).maybeSingle();
      if (!row?.asaas_customer_id) {
        return new Response(JSON.stringify({ error: "asaas_customer_id required or sync customer first" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      asaasCustomerId = row.asaas_customer_id;
    }
    const due = dueDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const asaasBillingType = toAsaasBillingType(billingType ?? "boleto");
    const leanBody = {
      customer: asaasCustomerId,
      billingType: asaasBillingType,
      value: Number(value),
      dueDate: due,
      description: description ?? undefined,
    };
    const asaasRes = await fetch(`${ASAAS_BASE}/lean/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_KEY,
        "User-Agent": "CanfyMobile/1.0",
      },
      body: JSON.stringify(leanBody),
    });
    const asaasData = await asaasRes.json().catch(() => ({}));
    if (!asaasRes.ok) {
      return new Response(JSON.stringify({ error: "Asaas error", details: asaasData }), { status: asaasRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const paymentId = asaasData.id ?? asaasData.object?.id;
    if (paymentId) {
      await supabase.from("asaas_payments").insert({
        user_id: userId,
        asaas_payment_id: paymentId,
        asaas_customer_id: asaasCustomerId,
        reference_type: reference_type ?? null,
        reference_id: reference_id ?? null,
        billing_type: asaasBillingType,
        value: Number(value),
        status: asaasData.status ?? asaasData.object?.status ?? null,
        due_date: due,
        invoice_url: asaasData.invoiceUrl ?? asaasData.object?.invoiceUrl ?? null,
        bank_slip_url: asaasData.bankSlipUrl ?? asaasData.object?.bankSlipUrl ?? null,
      });
    }
    return new Response(JSON.stringify({
      id: paymentId,
      status: asaasData.status ?? asaasData.object?.status,
      invoiceUrl: asaasData.invoiceUrl ?? asaasData.object?.invoiceUrl,
      bankSlipUrl: asaasData.bankSlipUrl ?? asaasData.object?.bankSlipUrl,
      ...asaasData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
