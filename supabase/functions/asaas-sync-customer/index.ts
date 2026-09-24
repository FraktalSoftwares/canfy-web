import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sem valor padrão de propósito. Com o fallback anterior para sandbox, um
 * ambiente de produção sem ASAAS_BASE_URL criava clientes em sandbox sem
 * emitir erro algum — e as cobranças seguintes nunca se tornariam reais.
 */
function envObrigatoria(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor || valor.trim() === "") {
    throw new Error(`Variável de ambiente ${nome} não configurada.`);
  }
  return valor;
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
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
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
    // Sem tolerar formatos alternativos: aceitar asaasData.object?.id mascarava
    // mudança de contrato do Asaas em vez de expô-la.
    const asaasCustomerId = asaasData.id;
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
