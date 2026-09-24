import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Receptor de eventos do Asaas: cobranças, splits, transferências e status de
 * subconta. Mantém asaas_payments, pedidos, repasses_medicos e medicos em
 * sincronia com o que de fato aconteceu no Asaas.
 *
 * IMPORTANTE: implantar com verify_jwt: false — o Asaas chama a URL direto e não
 * envia JWT. A autenticação é o header asaas-access-token, comparado com
 * ASAAS_WEBHOOK_ACCESS_TOKEN. Essa variável é OBRIGATÓRIA: antes, quando ela não
 * existia, a verificação era simplesmente pulada e o endpoint ficava aberto para
 * qualquer um marcar cobranças como pagas.
 *
 * Responde 200 em qualquer situação, inclusive erro, porque o Asaas pausa a fila
 * inteira de eventos diante de um não-2xx. A falha real não some: fica gravada em
 * asaas_webhook_events.erro, que a tela de repasses usa para sinalizar pendência.
 *
 * Idempotência: o Asaas reentrega eventos. asaas_webhook_events.event_id é único;
 * uma reentrega é descartada antes de tocar em qualquer saldo.
 *
 * Documentação: https://docs.asaas.com/docs/webhook-para-cobrancas
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Tradução do status do Asaas para o contrato de 3 valores que a UI já lê. */
function statusRepasse(asaasStatus: string): "pendente" | "efetuado" | "cancelado" {
  switch (asaasStatus.toUpperCase()) {
    case "DONE":
      return "efetuado";
    case "CANCELLED":
    case "REFUNDED":
      return "cancelado";
    default:
      // PENDING, AWAITING_CREDIT, BANK_PROCESSING, REFUSED, FAILED seguem
      // pendentes: REFUSED/FAILED viram "pendencia" pelo campo erro.
      return "pendente";
  }
}

type SplitPayload = {
  id?: string;
  walletId?: string;
  status?: string;
  refusalReason?: string;
  externalReference?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no webhook do Asaas.");
    return jsonRes({ error: "webhook não configurado" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  // Autenticação do webhook. Dois tokens são aceitos:
  //   - ASAAS_WEBHOOK_ACCESS_TOKEN (variável de ambiente), que é a configuração
  //     feita à mão no painel do Asaas e continua valendo;
  //   - o token guardado no Vault, gerado por asaas-configurar-webhook quando a
  //     variável é curta demais para o mínimo de 32 caracteres que o Asaas exige
  //     ao registrar um webhook pela API.
  // O Vault só é consultado se o header não bater com a variável — o caminho
  // comum não paga a ida ao banco.
  const recebido = req.headers.get("asaas-access-token") ?? "";
  const tokenEnv = Deno.env.get("ASAAS_WEBHOOK_ACCESS_TOKEN") ?? "";
  let autorizado = tokenEnv.length > 0 && recebido === tokenEnv;
  let existeAlgumToken = tokenEnv.length > 0;

  if (!autorizado) {
    const { data: tokenVault } = await supabase.rpc("asaas_ler_webhook_token");
    if (typeof tokenVault === "string" && tokenVault.length > 0) {
      existeAlgumToken = true;
      autorizado = recebido === tokenVault;
    }
  }

  if (!existeAlgumToken) {
    // Sem token nenhum configurado o endpoint estaria aberto. Falhar é mais
    // seguro do que aceitar eventos não autenticados que mexem em dinheiro.
    console.error("Nenhum token de webhook configurado (env nem Vault): recusando eventos.");
    return jsonRes({ error: "webhook não configurado" }, 500);
  }
  if (!autorizado) {
    return jsonRes({ error: "invalid webhook token" }, 401);
  }

  let body: {
    id?: string;
    event?: string;
    payment?: Record<string, unknown>;
    transfer?: Record<string, unknown>;
    account?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ received: true, ignored: "json inválido" });
  }

  const event = body.event;
  if (!event) {
    return jsonRes({ received: true, ignored: "evento sem nome" });
  }

  const payment = body.payment as Record<string, unknown> | undefined;
  const transfer = body.transfer as Record<string, unknown> | undefined;
  const account = body.account as Record<string, unknown> | undefined;

  // Chave de idempotência. O Asaas manda `id` no corpo; quando não manda,
  // derivamos uma chave determinística do próprio evento — é dedupe explícito,
  // não um valor inventado.
  const objetoId = (payment?.id ?? transfer?.id ?? account?.id ?? "sem-objeto") as string;
  const objetoStatus = (payment?.status ?? transfer?.status ?? "sem-status") as string;
  const eventId = body.id ?? `${event}:${objetoId}:${objetoStatus}`;

  const { data: eventoRegistrado, error: eventoError } = await supabase
    .from("asaas_webhook_events")
    .insert({ event_id: eventId, event, payload: body })
    .select("id")
    .maybeSingle();

  if (eventoError) {
    // Violação de unicidade = reentrega já processada. Qualquer outro erro é
    // registrado, mas não pode virar não-2xx sob pena de travar a fila do Asaas.
    if (eventoError.code === "23505") {
      return jsonRes({ received: true, duplicado: true });
    }
    console.error("asaas-webhook: falha ao registrar evento:", eventoError.message);
  }
  const eventoRowId = eventoRegistrado?.id as string | undefined;

  const marcarProcessado = async (erro?: string) => {
    if (!eventoRowId) return;
    await supabase
      .from("asaas_webhook_events")
      .update({ processado_em: new Date().toISOString(), erro: erro ?? null })
      .eq("id", eventoRowId);
  };

  try {
    // -----------------------------------------------------------------------
    // Status da subconta do médico.
    // -----------------------------------------------------------------------
    if (event.startsWith("ACCOUNT_STATUS")) {
      // A conta vem identificada por account.id — o payload de situação NÃO
      // traz walletId.
      const accountId = account?.id as string | undefined;

      // Lê accountStatus.general, que é o veredito. Derivar do nome do evento
      // estava errado: ACCOUNT_STATUS_COMMERCIAL_INFO_APPROVED contém
      // "APPROVED" mas aprova só os dados comerciais — marcar a conta inteira
      // como aprovada ali liberaria split numa conta que ainda não recebe.
      const statusConta = (body as {
        accountStatus?: Record<string, unknown>;
      }).accountStatus;
      const geral = String(statusConta?.general ?? "").toUpperCase();
      const novoStatus = geral === "APPROVED"
        ? "aprovado"
        : geral === "REJECTED"
        ? "recusado"
        : geral === "PENDING"
        ? "pendente_documentos"
        : "em_analise"; // AWAITING_APPROVAL e valores futuros

      if (!accountId) {
        await marcarProcessado("evento de situação de conta sem account.id");
        return jsonRes({ received: true, ignored: "conta sem id" });
      }
      if (!geral) {
        await marcarProcessado(`evento ${event} sem accountStatus.general`);
        return jsonRes({ received: true, ignored: "sem accountStatus.general" });
      }

      const { error: medicoError } = await supabase
        .from("medicos")
        .update({
          asaas_onboarding_status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("asaas_account_id", accountId);
      if (medicoError) {
        throw new Error(`falha ao atualizar a situação da subconta ${accountId}: ${medicoError.message}`);
      }

      await marcarProcessado();
      return jsonRes({ received: true, onboardingStatus: novoStatus });
    }

    // -----------------------------------------------------------------------
    // Transferências (repasse de consulta, e reprocesso de comissão de pedido).
    // -----------------------------------------------------------------------
    if (event.startsWith("TRANSFER_")) {
      const transferId = transfer?.id as string | undefined;
      const transferStatus = (transfer?.status as string | undefined) ?? "";
      if (transferId) {
        const falhou = ["FAILED", "CANCELLED"].includes(transferStatus.toUpperCase());
        await supabase
          .from("repasses_medicos")
          .update({
            asaas_status: transferStatus,
            status: statusRepasse(transferStatus),
            pago_em: transferStatus.toUpperCase() === "DONE" ? new Date().toISOString() : null,
            erro: falhou
              ? `Transferência ${transferStatus.toLowerCase()} no Asaas.`
              : null,
          })
          .eq("asaas_transfer_id", transferId);
      }
      await marcarProcessado();
      return jsonRes({ received: true });
    }

    // -----------------------------------------------------------------------
    // Cobranças.
    // -----------------------------------------------------------------------
    const paymentId = payment?.id as string | undefined;
    if (!paymentId) {
      await marcarProcessado("evento de cobrança sem id");
      return jsonRes({ received: true, ignored: "cobrança sem id" });
    }
    const paymentStatus = payment?.status as string | undefined;

    const { data: cobranca } = await supabase
      .from("asaas_payments")
      .select("id, reference_type, reference_id")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    if (!cobranca) {
      await marcarProcessado("cobrança desconhecida neste banco");
      return jsonRes({ received: true, ignored: "cobrança desconhecida" });
    }

    if (paymentStatus) {
      await supabase
        .from("asaas_payments")
        .update({ status: paymentStatus, updated_at: new Date().toISOString() })
        .eq("asaas_payment_id", paymentId);
    }

    const refType = (cobranca.reference_type as string | null)?.toLowerCase();
    const refId = cobranca.reference_id as string | null;

    // Pagamento entrou: libera o pedido.
    if (refId && refType === "order" && (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED")) {
      const { error: pedidoError } = await supabase
        .from("pedidos")
        .update({ status: "aprovado", updated_at: new Date().toISOString() })
        .eq("id", refId);
      if (pedidoError) {
        throw new Error(`falha ao aprovar o pedido ${refId}: ${pedidoError.message}`);
      }
      // Antes este insert vivia num catch vazio com o comentário "pode não
      // existir", o que perdia histórico em silêncio.
      const { error: histError } = await supabase.from("pedido_historico").insert({
        pedido_id: refId,
        status_anterior: "pendente",
        status_novo: "aprovado",
      });
      if (histError) {
        throw new Error(`pedido ${refId} aprovado, mas o histórico não foi gravado: ${histError.message}`);
      }
    }

    // Consultas não mudam de status aqui: o enum status_consulta não tem um
    // valor para "pago, aguardando atendimento", e a consulta segue 'agendada'
    // até o médico iniciar o atendimento.

    // -----------------------------------------------------------------------
    // Splits que vieram junto com a cobrança.
    // -----------------------------------------------------------------------
    const splits = (payment?.split as SplitPayload[] | undefined) ?? [];
    for (const split of splits) {
      if (!split?.status) continue;
      const recusado = ["REFUSED"].includes(split.status.toUpperCase());
      const atualizacao: Record<string, unknown> = {
        asaas_split_id: split.id ?? null,
        asaas_status: split.status,
        status: statusRepasse(split.status),
        refusal_reason: split.refusalReason ?? null,
        erro: recusado
          ? `Split recusado pelo Asaas: ${split.refusalReason ?? "sem motivo informado"}`
          : null,
      };
      if (split.status.toUpperCase() === "DONE") {
        atualizacao.pago_em = new Date().toISOString();
      }
      await supabase
        .from("repasses_medicos")
        .update(atualizacao)
        .eq("asaas_payment_id", paymentId)
        .eq("origem", "pedido");
    }

    // Split liquidado sem o array vir no payload.
    if (event === "PAYMENT_SPLIT_DONE" && splits.length === 0) {
      await supabase
        .from("repasses_medicos")
        .update({
          asaas_status: "DONE",
          status: "efetuado",
          pago_em: new Date().toISOString(),
          erro: null,
        })
        .eq("asaas_payment_id", paymentId)
        .eq("origem", "pedido");
    }

    if (event === "PAYMENT_SPLIT_CANCELLED") {
      await supabase
        .from("repasses_medicos")
        .update({ asaas_status: "CANCELLED", status: "cancelado" })
        .eq("asaas_payment_id", paymentId)
        .eq("origem", "pedido");
    }

    // Bloqueio por divergência: o Asaas dá 2 dias úteis para corrigir. Precisa
    // de gente olhando, então vira pendência explícita.
    if (event === "PAYMENT_SPLIT_DIVERGENCE_BLOCK") {
      await supabase
        .from("repasses_medicos")
        .update({
          erro: "Split bloqueado por divergência de valor. Corrija em até 2 dias úteis no Asaas.",
        })
        .eq("asaas_payment_id", paymentId);
    }
    if (event === "PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED") {
      await supabase
        .from("repasses_medicos")
        .update({ erro: null })
        .eq("asaas_payment_id", paymentId);
    }

    // Estorno da cobrança: o Asaas reverte os splits sozinho; aqui só refletimos.
    const eventosDeReversao = [
      "PAYMENT_REFUNDED",
      "PAYMENT_PARTIALLY_REFUNDED",
      "PAYMENT_DELETED",
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_REFUND_IN_PROGRESS",
    ];
    if (eventosDeReversao.includes(event)) {
      await supabase
        .from("repasses_medicos")
        .update({
          asaas_status: "REFUNDED",
          status: "cancelado",
          observacao: `Revertido por ${event}`,
        })
        .eq("asaas_payment_id", paymentId);
    }

    await marcarProcessado();
    return jsonRes({ received: true });
  } catch (e) {
    const mensagem = (e as Error).message;
    console.error("asaas-webhook:", mensagem);
    await marcarProcessado(mensagem);
    // 200 de propósito: não-2xx pausa a fila inteira do Asaas.
    return jsonRes({ received: true, erro: mensagem });
  }
});
