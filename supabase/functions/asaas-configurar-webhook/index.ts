import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Registra (ou atualiza) o webhook da conta-mãe no Asaas, com todos os eventos
 * que o receptor `asaas-webhook` sabe tratar.
 *
 * Existe porque configurar isso à mão no painel é passo silencioso e fácil de
 * esquecer: sem os eventos de split e de transferência, o repasse sai no Asaas
 * mas nunca é refletido aqui — o médico recebe e o painel continua dizendo
 * "a transferir". Fazer pela API deixa a configuração versionada e repetível.
 *
 * Sobre o authToken: o Asaas exige de 32 a 255 caracteres. Quando
 * ASAAS_WEBHOOK_ACCESS_TOKEN atende, ele é usado (e a configuração existente no
 * painel segue valendo). Quando não atende — é o caso hoje —, geramos um token
 * forte, guardamos no Vault e registramos com ele; o receptor aceita os dois.
 *
 * Idempotente: se já existir um webhook apontando para a nossa URL, ele é
 * atualizado em vez de duplicado.
 *
 * Autorização: admin com permissão de editar usuários.
 * Body: { rotacionarToken?: boolean }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envObrigatoria(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor || valor.trim() === "") {
    throw new Error(`Variável de ambiente ${nome} não configurada.`);
  }
  return valor;
}

/** Só os eventos que `asaas-webhook` realmente trata. Pedir mais é ruído. */
const EVENTOS = [
  // Cobranças
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_CHARGEBACK_REQUESTED",
  // Split
  "PAYMENT_SPLIT_DONE",
  "PAYMENT_SPLIT_CANCELLED",
  "PAYMENT_SPLIT_DIVERGENCE_BLOCK",
  "PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED",
  // Transferências (repasse de consulta)
  "TRANSFER_CREATED",
  "TRANSFER_PENDING",
  "TRANSFER_IN_BANK_PROCESSING",
  "TRANSFER_BLOCKED",
  "TRANSFER_DONE",
  "TRANSFER_FAILED",
  "TRANSFER_CANCELLED",
];

function gerarToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); // 64 chars
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "method not allowed" }, 405);
  }

  let asaasBase: string;
  let asaasKey: string;
  let supabaseUrl: string;
  let serviceKey: string;
  try {
    asaasBase = envObrigatoria("ASAAS_BASE_URL").replace(/\/+$/, "");
    asaasKey = envObrigatoria("ASAAS_API_KEY");
    supabaseUrl = envObrigatoria("SUPABASE_URL");
    serviceKey = envObrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) {
    return jsonRes({ error: (e as Error).message }, 500);
  }

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonRes({ error: "missing authorization" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) return jsonRes({ error: "invalid token" }, 401);

    const { data: podeEditar, error: permErr } = await supabase.rpc("has_permission", {
      _user_id: userData.user.id,
      _modulo: "usuarios",
      _acao: "editar",
    });
    if (permErr) {
      return jsonRes({ error: "permission check failed", detail: permErr.message }, 500);
    }
    if (!podeEditar) return jsonRes({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({})) as { rotacionarToken?: boolean };

    // ---------------------------------------------------------------------
    // Qual token usar.
    // ---------------------------------------------------------------------
    const tokenEnv = Deno.env.get("ASAAS_WEBHOOK_ACCESS_TOKEN") ?? "";
    let authToken: string;
    let origemToken: string;

    if (tokenEnv.length >= 32 && !body.rotacionarToken) {
      authToken = tokenEnv;
      origemToken = "variável de ambiente";
    } else {
      const { data: tokenVault } = await supabase.rpc("asaas_ler_webhook_token");
      if (typeof tokenVault === "string" && tokenVault.length >= 32 && !body.rotacionarToken) {
        authToken = tokenVault;
        origemToken = "Vault (já existia)";
      } else {
        authToken = gerarToken();
        const { error: saveErr } = await supabase.rpc("asaas_guardar_webhook_token", {
          p_token: authToken,
        });
        if (saveErr) {
          return jsonRes({ error: "falha ao guardar o token do webhook", detail: saveErr.message }, 500);
        }
        origemToken = "gerado agora e guardado no Vault";
      }
    }

    const url = `${supabaseUrl}/functions/v1/asaas-webhook`;
    const cabecalhos = {
      "Content-Type": "application/json",
      "access_token": asaasKey,
      "User-Agent": "Canfy/1.0 (contato@canfy.com.br)",
    };

    // ---------------------------------------------------------------------
    // Já existe um webhook nosso? Atualiza em vez de duplicar.
    // ---------------------------------------------------------------------
    const listaRes = await fetch(`${asaasBase}/webhooks`, { headers: cabecalhos });
    const listaData = await listaRes.json().catch(() => ({}));
    if (!listaRes.ok) {
      return jsonRes({ error: "erro ao listar webhooks no Asaas", detail: listaData }, 502);
    }
    const existente = (listaData?.data as Array<Record<string, unknown>> | undefined)
      ?.find((w) => String(w?.url ?? "") === url);

    const payload = {
      name: "Canfy — cobranças, split e transferências",
      url,
      email: "contato@canfy.com.br",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken,
      sendType: "SEQUENTIALLY",
      events: EVENTOS,
    };

    const salvarRes = await fetch(
      existente ? `${asaasBase}/webhooks/${existente.id}` : `${asaasBase}/webhooks`,
      {
        method: existente ? "PUT" : "POST",
        headers: cabecalhos,
        body: JSON.stringify(payload),
      },
    );
    const salvarData = await salvarRes.json().catch(() => ({}));
    if (!salvarRes.ok) {
      const detalhe = typeof salvarData?.errors?.[0]?.description === "string"
        ? salvarData.errors[0].description
        : typeof salvarData?.message === "string"
        ? salvarData.message
        : undefined;
      return jsonRes({
        error: detalhe ?? "erro ao salvar o webhook no Asaas",
        detail: salvarData,
      }, 502);
    }

    return jsonRes({
      ok: true,
      acao: existente ? "atualizado" : "criado",
      webhookId: salvarData?.id ?? existente?.id ?? null,
      url,
      eventos: EVENTOS.length,
      origemToken,
      // Sem expor o token: só o suficiente para conferir que é o mesmo dos dois lados.
      tokenTamanho: authToken.length,
    });
  } catch (e) {
    return jsonRes({ error: "internal", detail: (e as Error).message }, 500);
  }
});
