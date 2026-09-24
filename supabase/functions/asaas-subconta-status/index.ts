import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Consulta o estado da subconta Asaas do médico e atualiza
 * medicos.asaas_onboarding_status.
 *
 * Existe porque o webhook ACCOUNT_STATUS_* pode não chegar (evento desabilitado,
 * entrega perdida), e o médico ficaria preso em "em_analise" sem receber nada,
 * sem ninguém perceber. É o botão "Atualizar status" do app e do admin.
 *
 * IMPORTANTE — usa `GET /v3/myAccount/status` autenticado com a apiKey DA
 * SUBCONTA, não com a chave da conta-mãe. A versão anterior lia o campo
 * `general` de `GET /v3/accounts/{id}`, que **não existe**: aquele endpoint
 * devolve só dados cadastrais (object, id, name, email, walletId,
 * accountNumber, commercialInfoExpiration). O efeito era grave e silencioso —
 * a função sempre respondia "em_analise", o estado 'aprovado' nunca era
 * alcançado e, como split e transferência exigem 'aprovado', nenhum repasse
 * jamais sairia.
 *
 * Autorização: o próprio médico ou admin com permissão de editar usuários.
 *
 * Body: { medico_id?: uuid }
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

/**
 * O Asaas avalia a conta em quatro frentes (commercialInfo, bankAccountInfo,
 * documentation, general), cada uma em APPROVED | AWAITING_APPROVAL | PENDING |
 * REJECTED. Só `general` decide se a conta pode receber — as outras são
 * diagnóstico de qual etapa falta.
 */
function traduzirStatus(geralBruto: unknown): string {
  switch (String(geralBruto ?? "").toUpperCase()) {
    case "APPROVED":
      return "aprovado";
    case "REJECTED":
      return "recusado";
    case "PENDING":
      return "pendente_documentos";
    default:
      // AWAITING_APPROVAL e qualquer valor novo que o Asaas venha a introduzir.
      return "em_analise";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "method not allowed" }, 405);
  }

  let asaasBase: string;
  let supabaseUrl: string;
  let serviceKey: string;
  try {
    asaasBase = envObrigatoria("ASAAS_BASE_URL").replace(/\/+$/, "");
    supabaseUrl = envObrigatoria("SUPABASE_URL");
    serviceKey = envObrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) {
    return jsonRes({ error: (e as Error).message }, 500);
  }

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return jsonRes({ error: "missing authorization" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonRes({ error: "invalid token" }, 401);
    }
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({})) as { medico_id?: string };

    let medicoId = body.medico_id;
    if (medicoId) {
      const { data: proprio } = await supabase
        .from("medicos")
        .select("id")
        .eq("id", medicoId)
        .eq("user_id", callerId)
        .maybeSingle();
      if (!proprio) {
        const { data: podeEditar, error: permErr } = await supabase.rpc("has_permission", {
          _user_id: callerId,
          _modulo: "usuarios",
          _acao: "editar",
        });
        if (permErr) {
          return jsonRes({ error: "permission check failed", detail: permErr.message }, 500);
        }
        if (!podeEditar) {
          return jsonRes({ error: "forbidden" }, 403);
        }
      }
    } else {
      const { data: medicoDoUsuario } = await supabase
        .from("medicos")
        .select("id")
        .eq("user_id", callerId)
        .maybeSingle();
      if (!medicoDoUsuario) {
        return jsonRes({ error: "usuário não é médico e nenhum medico_id foi informado" }, 400);
      }
      medicoId = medicoDoUsuario.id as string;
    }

    const { data: medico } = await supabase
      .from("medicos")
      .select("id, asaas_account_id, asaas_onboarding_status, asaas_onboarding_url, asaas_apikey_secret_id")
      .eq("id", medicoId)
      .maybeSingle();
    if (!medico) {
      return jsonRes({ error: "médico não encontrado" }, 404);
    }
    if (!medico.asaas_account_id) {
      return jsonRes({ error: "médico ainda não possui subconta Asaas" }, 409);
    }

    // A consulta de situação é escopada à própria conta: exige a apiKey da
    // subconta. Subcontas criadas antes desta mudança tiveram a chave
    // descartada e precisam de uma nova via POST /v3/accounts/{id}/apiKeys.
    const { data: apiKeySubconta, error: vaultError } = await supabase
      .rpc("asaas_ler_apikey_subconta", { p_medico_id: medicoId });
    if (vaultError) {
      return jsonRes({ error: "falha ao ler a credencial da subconta", detail: vaultError.message }, 500);
    }
    if (!apiKeySubconta) {
      return jsonRes({
        error:
          "Não há credencial guardada para esta subconta, então o status não pode ser consultado. " +
          "Gere uma nova chave para a subconta no Asaas ou aguarde o webhook de aprovação.",
      }, 409);
    }

    const asaasRes = await fetch(`${asaasBase}/myAccount/status`, {
      headers: {
        "access_token": apiKeySubconta as string,
        "User-Agent": "Canfy/1.0 (contato@canfy.com.br)",
      },
    });
    const asaasData = await asaasRes.json().catch(() => ({}));
    if (!asaasRes.ok) {
      return jsonRes({ error: "erro ao consultar a situação da subconta no Asaas", detail: asaasData }, 502);
    }

    const novoStatus = traduzirStatus(asaasData?.general);
    const onboardingUrl = medico.asaas_onboarding_url ?? null;

    const { error: updateError } = await supabase
      .from("medicos")
      .update({
        asaas_onboarding_status: novoStatus,
        asaas_onboarding_url: onboardingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", medicoId);
    if (updateError) {
      return jsonRes({ error: "falha ao gravar o status da subconta", detail: updateError.message }, 500);
    }

    return jsonRes({
      ok: true,
      onboardingStatus: novoStatus,
      onboardingUrl,
      podeReceber: novoStatus === "aprovado",
      // Diagnóstico de qual etapa falta, para o operador não ficar no escuro.
      etapas: {
        dadosComerciais: asaasData?.commercialInfo ?? null,
        contaBancaria: asaasData?.bankAccountInfo ?? null,
        documentacao: asaasData?.documentation ?? null,
        geral: asaasData?.general ?? null,
      },
    });
  } catch (e) {
    return jsonRes({ error: "internal", detail: (e as Error).message }, 500);
  }
});
