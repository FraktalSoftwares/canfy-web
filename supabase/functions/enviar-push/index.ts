import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Envia uma push notification (FCM HTTP v1) para todos os dispositivos
 * registrados de um usuário (tabela push_tokens).
 *
 * Autorização: chamada de sistema (header x-cron-secret == CRON_DISPATCH_SECRET,
 * usada pelo motor de fila de prioridade via pg_net) OU usuário autenticado
 * (uso direto futuro pelo app). Sem FIREBASE_SERVICE_ACCOUNT_JSON configurado,
 * vira no-op gracioso (200 { sent: false }) — mesmo padrão de
 * dispatch-notificacao quando RESEND_API_KEY não está configurado.
 *
 * Segredo necessário: FIREBASE_SERVICE_ACCOUNT_JSON — o JSON completo da chave
 * de service account gerada em Firebase Console > Configurações do projeto >
 * Contas de serviço > Gerar nova chave privada.
 */

const CRON_DISPATCH_SECRET = Deno.env.get("CRON_DISPATCH_SECRET");
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function base64url(bytes: ArrayBuffer | string): string {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) {
    return cachedToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`token exchange failed: ${JSON.stringify(data)}`);
  }
  cachedToken = { token: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const cronSecret = req.headers.get("x-cron-secret");
    const isSystemCall = !!CRON_DISPATCH_SECRET && cronSecret === CRON_DISPATCH_SECRET;

    if (!isSystemCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return jsonResponse({ error: "Invalid token" }, 401);
      }
    }

    const body = await req.json().catch(() => ({})) as {
      userId?: string;
      titulo?: string;
      corpo?: string;
      data?: Record<string, unknown>;
    };
    const { userId, titulo, corpo } = body;
    if (!userId || !titulo || !corpo) {
      return jsonResponse({ error: "userId, titulo e corpo são obrigatórios" }, 400);
    }

    if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
      return jsonResponse({ sent: false, reason: "FIREBASE_SERVICE_ACCOUNT_JSON não configurado" }, 200);
    }

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);
    if (tokensError) {
      return jsonResponse({ error: "erro ao buscar tokens", detail: tokensError.message }, 500);
    }
    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: false, reason: "usuário sem token registrado" }, 200);
    }

    const sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    const accessToken = await getAccessToken(sa);

    const dataPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.data ?? {})) {
      dataPayload[k] = String(v);
    }

    let sent = 0;
    const invalidTokens: string[] = [];
    for (const { token } of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: titulo, body: corpo },
              data: dataPayload,
            },
          }),
        },
      );
      if (res.ok) {
        sent += 1;
      } else {
        const errData = await res.json().catch(() => ({}));
        const status = errData?.error?.status;
        if (status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
          invalidTokens.push(token);
        }
      }
    }

    if (invalidTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", invalidTokens);
    }

    return jsonResponse({ sent: sent > 0, delivered: sent, total: tokens.length }, 200);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
