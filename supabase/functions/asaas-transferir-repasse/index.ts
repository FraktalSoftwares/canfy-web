import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Executa o repasse ao médico por transferência entre contas Asaas
 * (POST /v3/transfers).
 *
 * É o caminho do dinheiro da CONSULTA: no momento da cobrança da consulta o
 * médico ainda não existe — a consulta entra numa fila e só depois alguém a
 * assume (medico_assumir_consulta) —, então não há walletId para colocar no
 * split. A trigger consulta_finalizada_gerar_repasse chama esta função via
 * pg_net assim que a consulta é finalizada.
 *
 * Também atende o reprocesso de uma COMISSÃO DE PEDIDO cujo split não saiu (o
 * médico ainda não tinha carteira quando a cobrança foi criada, por exemplo).
 * Não dá para anexar split a uma cobrança já recebida, então a transferência é
 * a única forma de pagar esses casos.
 *
 * Autorização: header x-cron-secret == CRON_DISPATCH_SECRET (chamada da trigger,
 * onde não há usuário logado) ou admin/super_admin.
 *
 * Body: { repasse_id: uuid }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const cronSecret = Deno.env.get("CRON_DISPATCH_SECRET");
    const isSystemCall = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

    if (!isSystemCall) {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!jwt) {
        return jsonRes({ error: "missing authorization" }, 401);
      }
      const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
      if (userError || !userData?.user) {
        return jsonRes({ error: "invalid token" }, 401);
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
      if (!isAdmin) {
        return jsonRes({ error: "forbidden" }, 403);
      }
    }

    const body = await req.json().catch(() => null) as { repasse_id?: string } | null;
    const repasseId = body?.repasse_id;
    if (!repasseId) {
      return jsonRes({ error: "repasse_id é obrigatório" }, 400);
    }

    const { data: repasse } = await supabase
      .from("repasses_medicos")
      .select("id, medico_id, valor, status, origem, asaas_payment_id, asaas_transfer_id, consulta_id, pedido_id")
      .eq("id", repasseId)
      .maybeSingle();
    if (!repasse) {
      return jsonRes({ error: "repasse não encontrado" }, 404);
    }
    if (repasse.asaas_transfer_id) {
      return jsonRes({ ok: true, ignorado: "repasse já possui transferência", transferId: repasse.asaas_transfer_id });
    }
    if (repasse.status !== "pendente") {
      return jsonRes({ ok: true, ignorado: `repasse com status '${repasse.status}'` });
    }

    const registrarImpedimento = async (motivo: string) => {
      await supabase
        .from("repasses_medicos")
        .update({ erro: motivo, asaas_status: "PENDING" })
        .eq("id", repasseId);
    };

    // Kill switch: cobranças continuam saindo, mas nenhum dinheiro é movido.
    const { data: config } = await supabase
      .from("configuracoes_sistema")
      .select("asaas_split_ativo")
      .eq("id", 1)
      .maybeSingle();
    if (config?.asaas_split_ativo !== true) {
      await registrarImpedimento("Repasse automático desligado (asaas_split_ativo = false).");
      return jsonRes({ ok: true, ignorado: "repasse automático desligado" });
    }

    const { data: medico } = await supabase
      .from("medicos")
      .select("id, nome, asaas_wallet_id, asaas_onboarding_status")
      .eq("id", repasse.medico_id)
      .maybeSingle();
    if (!medico?.asaas_wallet_id) {
      await registrarImpedimento("Médico sem carteira Asaas: crie a subconta antes de repassar.");
      return jsonRes({ ok: true, ignorado: "médico sem carteira" });
    }
    if (medico.asaas_onboarding_status !== "aprovado") {
      await registrarImpedimento(
        `Subconta Asaas do médico não aprovada (status: ${medico.asaas_onboarding_status}).`,
      );
      return jsonRes({ ok: true, ignorado: "subconta não aprovada" });
    }

    const valor = Number(repasse.valor);
    if (!(valor > 0)) {
      await registrarImpedimento("Valor do repasse é zero ou inválido.");
      return jsonRes({ ok: true, ignorado: "valor inválido" });
    }

    // A Canfy só repassa o que já recebeu. Sem esta trava, uma consulta
    // finalizada antes da confirmação do pagamento sairia do próprio caixa.
    if (!repasse.asaas_payment_id) {
      await registrarImpedimento("Repasse sem cobrança vinculada: não há pagamento a repassar.");
      return jsonRes({ ok: true, ignorado: "sem cobrança vinculada" });
    }
    const { data: cobranca } = await supabase
      .from("asaas_payments")
      .select("status")
      .eq("asaas_payment_id", repasse.asaas_payment_id)
      .maybeSingle();
    const statusCobranca = (cobranca?.status ?? "").toUpperCase();
    if (!["RECEIVED", "CONFIRMED"].includes(statusCobranca)) {
      await registrarImpedimento(
        `Cobrança ainda não recebida (status: ${statusCobranca || "desconhecido"}); nada a repassar por enquanto.`,
      );
      return jsonRes({ ok: true, ignorado: "cobrança não recebida" });
    }

    // Reivindica a linha antes de chamar o Asaas. Dois disparos concorrentes
    // (trigger + reprocesso manual) só podem resultar numa transferência.
    const { data: reivindicado } = await supabase
      .from("repasses_medicos")
      .update({ asaas_status: "BANK_PROCESSING", erro: null })
      .eq("id", repasseId)
      .is("asaas_transfer_id", null)
      .neq("asaas_status", "BANK_PROCESSING")
      .select("id")
      .maybeSingle();
    if (!reivindicado) {
      return jsonRes({ ok: true, ignorado: "repasse já está sendo processado" });
    }

    const asaasRes = await fetch(`${asaasBase}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasKey,
        "User-Agent": "Canfy/1.0 (contato@canfy.com.br)",
      },
      body: JSON.stringify({
        value: valor,
        walletId: medico.asaas_wallet_id,
        externalReference: repasseId,
        description: `Repasse Canfy — ${repasse.origem} (${repasseId})`,
      }),
    });
    const asaasData = await asaasRes.json().catch(() => ({}));

    if (!asaasRes.ok) {
      const detalhe = typeof asaasData?.errors?.[0]?.description === "string"
        ? asaasData.errors[0].description
        : JSON.stringify(asaasData);
      // Devolve a linha ao estado reprocessável em vez de deixá-la travada.
      await supabase
        .from("repasses_medicos")
        .update({ asaas_status: "PENDING", erro: `Asaas recusou a transferência: ${detalhe}` })
        .eq("id", repasseId);
      return jsonRes({ error: "erro ao transferir no Asaas", detail: asaasData }, 502);
    }

    const transferId = asaasData?.id;
    if (!transferId) {
      await supabase
        .from("repasses_medicos")
        .update({ asaas_status: "PENDING", erro: "Asaas não retornou o id da transferência." })
        .eq("id", repasseId);
      return jsonRes({ error: "Asaas não retornou o id da transferência", detail: asaasData }, 502);
    }

    const statusTransferencia = (asaasData?.status as string | undefined) ?? "PENDING";
    const concluida = statusTransferencia.toUpperCase() === "DONE";

    await supabase
      .from("repasses_medicos")
      .update({
        asaas_transfer_id: transferId,
        asaas_status: statusTransferencia,
        status: concluida ? "efetuado" : "pendente",
        pago_em: concluida ? new Date().toISOString() : null,
        erro: null,
      })
      .eq("id", repasseId);

    return jsonRes({ ok: true, transferId, status: statusTransferencia, valor });
  } catch (e) {
    return jsonRes({ error: "internal", detail: (e as Error).message }, 500);
  }
});
