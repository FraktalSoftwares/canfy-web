import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cria uma cobrança Asaas para um pedido ou uma consulta e, no caso de pedido,
 * anexa o Split de Pagamento que credita a comissão do médico automaticamente.
 *
 * Três garantias que esta função sustenta:
 *
 *   1. O valor NUNCA vem do cliente. É derivado no servidor a partir da
 *      referência (pedidos.valor_total / consultas.valor). O campo `value` do
 *      body é aceito apenas como conferência: divergência devolve 400.
 *   2. Nenhum fallback silencioso. Variável de ambiente ausente, método de
 *      pagamento desconhecido ou referência inválida devolvem erro — jamais um
 *      valor substituto que produziria cobrança errada sem log.
 *   3. O cálculo da comissão mora só no banco (calcular_repasse_pedido). Esta
 *      função transporta o número para o split[] e grava o repasse com o mesmo
 *      valor, de modo que o livro-caixa sempre bata com o que o Asaas repassou.
 *
 * Consultas não usam split: no momento da cobrança o médico ainda não existe
 * (a consulta entra numa fila e só depois alguém a assume). O repasse da
 * consulta sai por transferência, em asaas-transferir-repasse.
 *
 * Body: { reference_type: 'order'|'consultation', reference_id: uuid,
 *         billingType: 'pix'|'boleto'|'credit_card', value?: number }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// DEBIT_CARD não entra: /lean/payments não aceita débito como tipo avulso, e
// mapeá-lo para boleto (comportamento anterior) cobrava o paciente de um jeito
// que ele não escolheu.
const BILLING_TYPES: Record<string, string> = {
  credit_card: "CREDIT_CARD",
  pix: "PIX",
  boleto: "BOLETO",
};

const REFERENCE_TYPES = ["order", "consultation"] as const;
type ReferenceType = typeof REFERENCE_TYPES[number];

// Cobranças já encerradas não bloqueiam uma nova tentativa de pagamento.
const STATUS_ENCERRADOS = ["CANCELLED", "REFUNDED", "DELETED"];

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Sem fallback: ambiente incompleto é erro de configuração, não um default. */
function envObrigatoria(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor || valor.trim() === "") {
    throw new Error(`Variável de ambiente ${nome} não configurada.`);
  }
  return valor;
}

function dataVencimentoPadrao(): string {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    // ASAAS_BASE_URL sem valor padrão de propósito: com o fallback antigo para
    // sandbox, um ambiente de produção sem a variável cobrava em sandbox — o
    // paciente "pagava", nada entrava e nenhum split ocorria, sem erro nenhum.
    asaasBase = envObrigatoria("ASAAS_BASE_URL").replace(/\/+$/, "");
    asaasKey = envObrigatoria("ASAAS_API_KEY");
    supabaseUrl = envObrigatoria("SUPABASE_URL");
    serviceKey = envObrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) {
    return jsonRes({ error: (e as Error).message }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return jsonRes({ error: "missing authorization" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonRes({ error: "invalid token" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null) as {
      reference_type?: string;
      reference_id?: string;
      billingType?: string;
      value?: number;
      description?: string;
    } | null;
    if (!body) {
      return jsonRes({ error: "corpo da requisição inválido" }, 400);
    }

    const referenceType = body.reference_type as ReferenceType | undefined;
    if (!referenceType || !REFERENCE_TYPES.includes(referenceType)) {
      return jsonRes(
        { error: `reference_type inválido. Aceitos: ${REFERENCE_TYPES.join(", ")}` },
        400,
      );
    }
    const referenceId = body.reference_id;
    if (!referenceId) {
      return jsonRes({ error: "reference_id é obrigatório" }, 400);
    }

    const metodo = (body.billingType ?? "").toLowerCase();
    const asaasBillingType = BILLING_TYPES[metodo];
    if (!asaasBillingType) {
      return jsonRes(
        { error: `billingType inválido. Aceitos: ${Object.keys(BILLING_TYPES).join(", ")}` },
        400,
      );
    }

    // ---------------------------------------------------------------------
    // Valor derivado no servidor a partir da referência, e conferência de posse.
    // ---------------------------------------------------------------------
    let valor: number;
    let descricao: string;
    let pedidoId: string | null = null;

    if (referenceType === "order") {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, valor_total, status, pacientes!inner(user_id)")
        .eq("id", referenceId)
        .maybeSingle();
      if (!pedido) {
        return jsonRes({ error: "pedido não encontrado" }, 404);
      }
      const dono = (pedido as { pacientes?: { user_id?: string } }).pacientes?.user_id;
      if (dono !== userId) {
        return jsonRes({ error: "forbidden" }, 403);
      }
      if (pedido.valor_total == null || Number(pedido.valor_total) <= 0) {
        return jsonRes({ error: "pedido sem valor_total definido" }, 409);
      }
      valor = Number(pedido.valor_total);
      pedidoId = pedido.id as string;
      descricao = body.description ?? `Pedido ${pedido.numero_pedido ?? pedido.id}`;
    } else {
      const { data: consulta } = await supabase
        .from("consultas")
        .select("id, valor, data_consulta, pacientes!inner(user_id)")
        .eq("id", referenceId)
        .maybeSingle();
      if (!consulta) {
        return jsonRes({ error: "consulta não encontrada" }, 404);
      }
      const dono = (consulta as { pacientes?: { user_id?: string } }).pacientes?.user_id;
      if (dono !== userId) {
        return jsonRes({ error: "forbidden" }, 403);
      }
      if (consulta.valor == null || Number(consulta.valor) <= 0) {
        return jsonRes({ error: "consulta sem valor definido" }, 409);
      }
      valor = Number(consulta.valor);
      descricao = body.description ?? "Consulta Canfy";
    }

    // Conferência: divergência entre o que o app mostrou e o que o servidor
    // calculou é bug, e o paciente não pode ser cobrado no meio da dúvida.
    if (body.value != null && Math.abs(Number(body.value) - valor) >= 0.01) {
      return jsonRes(
        {
          error: "valor divergente do servidor",
          detail: `informado R$ ${Number(body.value).toFixed(2)}, correto R$ ${valor.toFixed(2)}`,
        },
        400,
      );
    }

    // ---------------------------------------------------------------------
    // Idempotência: um retry após falha parcial não pode gerar duas cobranças
    // (e, com split, dois repasses) para a mesma referência.
    // ---------------------------------------------------------------------
    const { data: cobrancaExistente } = await supabase
      .from("asaas_payments")
      .select("asaas_payment_id, status, invoice_url, bank_slip_url, billing_type")
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      cobrancaExistente?.asaas_payment_id &&
      !STATUS_ENCERRADOS.includes((cobrancaExistente.status ?? "").toUpperCase())
    ) {
      return jsonRes({
        id: cobrancaExistente.asaas_payment_id,
        status: cobrancaExistente.status,
        invoiceUrl: cobrancaExistente.invoice_url,
        bankSlipUrl: cobrancaExistente.bank_slip_url,
        reaproveitada: true,
      });
    }

    // ---------------------------------------------------------------------
    // Cliente Asaas do paciente.
    // ---------------------------------------------------------------------
    const { data: clienteRow } = await supabase
      .from("asaas_customers")
      .select("asaas_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    const asaasCustomerId = clienteRow?.asaas_customer_id;
    if (!asaasCustomerId) {
      return jsonRes({ error: "paciente sem cadastro no Asaas: sincronize o cliente primeiro" }, 409);
    }

    // ---------------------------------------------------------------------
    // Split (só pedido). fixedValue, não percentualValue: o percentual do Asaas
    // incide sobre o netValue, que inclui frete e já vem com a taxa descontada,
    // e não reproduz a regra "percentual sobre valor_total - frete".
    // ---------------------------------------------------------------------
    const { data: config } = await supabase
      .from("configuracoes_sistema")
      .select("asaas_split_ativo")
      .eq("id", 1)
      .maybeSingle();
    const splitAtivo = config?.asaas_split_ativo === true;

    let split: Array<Record<string, unknown>> | undefined;
    if (referenceType === "order" && splitAtivo && pedidoId) {
      const { data: calcRows, error: calcError } = await supabase
        .rpc("calcular_repasse_pedido", { p_pedido_id: pedidoId });
      if (calcError) {
        // Pedido sem receita vinculada cai aqui. A cobrança segue sem split e o
        // problema fica registrado; não é motivo para impedir o paciente de pagar.
        console.error("calcular_repasse_pedido falhou:", calcError.message);
      } else {
        const calc = Array.isArray(calcRows) ? calcRows[0] : calcRows;
        const comissao = Number(calc?.valor ?? 0);
        const wallet = calc?.wallet_id as string | null | undefined;
        // `erro` preenchido = impedimento conhecido (sem carteira, subconta não
        // aprovada). Cobra-se sem split e o repasse nasce em pendência.
        if (!calc?.erro && wallet && comissao > 0) {
          if (comissao > valor * 0.9) {
            console.error(
              `Split abortado no pedido ${pedidoId}: comissão R$ ${comissao} acima de 90% da cobrança R$ ${valor}.`,
            );
          } else {
            split = [{
              walletId: wallet,
              fixedValue: comissao,
              externalReference: pedidoId,
              description: `Comissão do médico — pedido ${pedidoId}`,
            }];
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Cobrança no Asaas.
    // ---------------------------------------------------------------------
    const vencimento = dataVencimentoPadrao();
    const leanBody: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType: asaasBillingType,
      value: valor,
      dueDate: vencimento,
      description: descricao,
      externalReference: referenceId,
    };
    if (split) {
      leanBody.split = split;
    }

    const asaasRes = await fetch(`${asaasBase}/lean/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasKey,
        "User-Agent": "Canfy/1.0 (contato@canfy.com.br)",
      },
      body: JSON.stringify(leanBody),
    });
    const asaasData = await asaasRes.json().catch(() => ({}));
    if (!asaasRes.ok) {
      return jsonRes({ error: "erro ao criar a cobrança no Asaas", detail: asaasData }, 502);
    }

    const paymentId = asaasData?.id;
    if (!paymentId) {
      // Antes havia fallback para asaasData.object?.id, que tolerava dois
      // formatos e escondia mudança de contrato do Asaas.
      return jsonRes({ error: "Asaas não retornou o id da cobrança", detail: asaasData }, 502);
    }

    const { error: insertError } = await supabase.from("asaas_payments").insert({
      user_id: userId,
      asaas_payment_id: paymentId,
      asaas_customer_id: asaasCustomerId,
      reference_type: referenceType,
      reference_id: referenceId,
      billing_type: asaasBillingType,
      value: valor,
      status: asaasData.status ?? null,
      due_date: vencimento,
      invoice_url: asaasData.invoiceUrl ?? null,
      bank_slip_url: asaasData.bankSlipUrl ?? null,
    });
    if (insertError) {
      // A cobrança existe no Asaas mas não foi registrada aqui: devolver o id
      // para que a operação seja recuperável em vez de virar cobrança órfã.
      return jsonRes({
        error: "cobrança criada no Asaas mas não registrada localmente",
        detail: insertError.message,
        asaas_payment_id: paymentId,
        invoiceUrl: asaasData.invoiceUrl ?? null,
      }, 500);
    }

    // Livro-caixa do repasse, com o mesmo valor que foi para o split.
    if (referenceType === "order" && pedidoId) {
      const { error: repasseError } = await supabase.rpc("gerar_repasse_pedido", {
        p_pedido_id: pedidoId,
        p_asaas_payment_id: paymentId,
      });
      if (repasseError) {
        console.error(`Repasse do pedido ${pedidoId} não pôde ser registrado:`, repasseError.message);
      }
    }

    return jsonRes({
      id: paymentId,
      status: asaasData.status ?? null,
      invoiceUrl: asaasData.invoiceUrl ?? null,
      bankSlipUrl: asaasData.bankSlipUrl ?? null,
      value: valor,
      dueDate: vencimento,
      splitAplicado: !!split,
    });
  } catch (e) {
    return jsonRes({ error: "internal", detail: (e as Error).message }, 500);
  }
});
