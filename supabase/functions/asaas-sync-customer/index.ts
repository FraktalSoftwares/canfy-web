import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ASAAS_BASE = Deno.env.get("ASAAS_BASE_URL") ?? "https://api-sandbox.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const body = await req.json().catch(() => ({})) as { name?: string; cpfCnpj?: string; email?: string; mobilePhone?: string };
    const { name, cpfCnpj, email, mobilePhone } = body;
    if (!name) {
      return new Response(JSON.stringify({ error: "name is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ASAAS_KEY) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: existing } = await supabase.from("asaas_customers").select("asaas_customer_id").eq("user_id", userId).maybeSingle();
    if (existing?.asaas_customer_id) {
      await supabase.from("profiles").update({ asaas_customer_id: existing.asaas_customer_id }).eq("id", userId);
      return new Response(JSON.stringify({ asaas_customer_id: existing.asaas_customer_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const asaasBody = { name, cpfCnpj: cpfCnpj ?? null, email: email ?? null, mobilePhone: mobilePhone ?? null };
    const asaasRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_KEY,
        "User-Agent": "CanfyMobile/1.0",
      },
      body: JSON.stringify(asaasBody),
    });
    const asaasData = await asaasRes.json().catch(() => ({}));
    if (!asaasRes.ok) {
      return new Response(JSON.stringify({ error: "Asaas error", details: asaasData }), { status: asaasRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const asaasCustomerId = asaasData.id ?? asaasData.object?.id;
    if (!asaasCustomerId) {
      return new Response(JSON.stringify({ error: "Asaas did not return customer id", details: asaasData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("asaas_customers").insert({ user_id: userId, asaas_customer_id: asaasCustomerId });
    await supabase.from("profiles").update({ asaas_customer_id: asaasCustomerId }).eq("id", userId);
    return new Response(JSON.stringify({ asaas_customer_id: asaasCustomerId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
