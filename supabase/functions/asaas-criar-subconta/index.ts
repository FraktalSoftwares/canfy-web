import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cria a subconta Asaas do médico (POST /v3/accounts) e guarda o walletId, que
 * é o destino do split das comissões de pedido e das transferências de consulta.
 *
 * Sem walletId não existe repasse automático: a cobrança sai sem split e o
 * repasse nasce em pendência. Por isso este é o primeiro passo do rollout.
 *
 * O apiKey da subconta, devolvido uma única vez pelo Asaas, é guardado CIFRADO
 * no Vault (asaas_guardar_apikey_subconta). Antes era descartado, até
 * descobrirmos ao testar que a aprovação da subconta não pode ser consultada com
 * a chave da conta-mãe: `GET /v3/accounts/{id}` não devolve campo de status
 * algum. Os únicos caminhos são o webhook ACCOUNT_STATUS_* (push) e
 * `GET /v3/myAccount/status` com a chave da própria subconta (pull) — e sem o
 * pull, um evento perdido travaria o médico para sempre.
 *
 * Por isso este endpoint também registra o webhook já na criação: sem ele o
 * estado 'aprovado' é inalcançável e nenhum repasse jamais sai.
 *
 * Autorização: o próprio médico (medicos.user_id = caller) ou admin com
 * permissão de editar usuários.
 *
 * Body: { medico_id?: uuid }  — omitido, usa o médico do próprio usuário logado.
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

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

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
      // Pedir por outro médico exige permissão administrativa.
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
      .select(
        "id, nome, email, telefone, cpf, cnpj, company_type, data_nascimento, renda_mensal, " +
          "cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, " +
          "asaas_account_id, asaas_wallet_id, asaas_onboarding_status",
      )
      .eq("id", medicoId)
      .maybeSingle();
    if (!medico) {
      return jsonRes({ error: "médico não encontrado" }, 404);
    }

    // Idempotente: nunca criar uma segunda subconta para o mesmo médico.
    if (medico.asaas_wallet_id) {
      return jsonRes({
        ok: true,
        jaExistia: true,
        walletId: medico.asaas_wallet_id,
        accountId: medico.asaas_account_id,
        onboardingStatus: medico.asaas_onboarding_status,
      });
    }

    // Validação explícita: o Asaas recusa a criação sem estes campos, e um erro
    // nosso em português é mais útil que o 400 genérico deles.
    const cpfCnpj = soDigitos(medico.cnpj) || soDigitos(medico.cpf);
    const telefone = soDigitos(medico.telefone);
    const cep = soDigitos(medico.cep);
    const faltando: string[] = [];
    if (!medico.nome) faltando.push("nome");
    if (!medico.email) faltando.push("e-mail");
    if (!cpfCnpj) faltando.push("CPF ou CNPJ");
    if (!telefone) faltando.push("telefone celular");
    if (medico.renda_mensal == null || Number(medico.renda_mensal) <= 0) faltando.push("renda/faturamento mensal");
    if (!medico.endereco_logradouro) faltando.push("logradouro");
    if (!medico.endereco_numero) faltando.push("número do endereço");
    if (!medico.endereco_bairro) faltando.push("bairro");
    if (!cep) faltando.push("CEP");
    if (faltando.length > 0) {
      return jsonRes({
        error: `Complete o cadastro antes de criar a carteira: ${faltando.join(", ")}.`,
        campos_faltantes: faltando,
      }, 400);
    }

    const ehPessoaJuridica = cpfCnpj.length === 14;
    const contaAsaas: Record<string, unknown> = {
      name: medico.nome,
      email: medico.email,
      cpfCnpj,
      mobilePhone: telefone,
      incomeValue: Number(medico.renda_mensal),
      address: medico.endereco_logradouro,
      addressNumber: medico.endereco_numero,
      province: medico.endereco_bairro,
      postalCode: cep,
    };
    if (medico.endereco_complemento) contaAsaas.complement = medico.endereco_complemento;
    if (ehPessoaJuridica) {
      // companyType é obrigatório para PJ; INDIVIDUAL é o tipo de empresário
      // individual no Asaas, não "pessoa física".
      contaAsaas.companyType = medico.company_type ?? "INDIVIDUAL";
    } else if (medico.data_nascimento) {
      contaAsaas.birthDate = medico.data_nascimento;
    }

    // Webhook de situação da conta, registrado já na criação. É a única fonte
    // de 'aprovado': sem ele, a subconta nunca sai de "em análise".
    // O Asaas exige authToken entre 32 e 255 caracteres; se o nosso for menor,
    // enviar o bloco faria o POST /accounts inteiro falhar e travaria o
    // onboarding. Nesse caso seguimos sem registrar e avisamos em
    // `webhookRegistrado: false` — degradação visível, não silenciosa.
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_ACCESS_TOKEN") ?? "";
    const podeRegistrarWebhook = webhookToken.length >= 32;
    if (podeRegistrarWebhook) {
      contaAsaas.webhooks = [{
        name: "Canfy — situação da conta",
        url: `${supabaseUrl}/functions/v1/asaas-webhook`,
        email: medico.email,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookToken,
        sendType: "SEQUENTIALLY",
        events: [
          "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED",
          "ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL",
          "ACCOUNT_STATUS_GENERAL_APPROVAL_PENDING",
          "ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED",
        ],
      }];
    } else {
      console.error(
        "ASAAS_WEBHOOK_ACCESS_TOKEN com menos de 32 caracteres: subconta criada sem webhook de situação.",
      );
    }

    const asaasRes = await fetch(`${asaasBase}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasKey,
        "User-Agent": "Canfy/1.0 (contato@canfy.com.br)",
      },
      body: JSON.stringify(contaAsaas),
    });
    const asaasData = await asaasRes.json().catch(() => ({}));
    if (!asaasRes.ok) {
      // O Asaas alterna entre {errors:[{description}]} e {message}. Ler só o
      // primeiro formato escondia o motivo real do operador.
      const detalhe = typeof asaasData?.errors?.[0]?.description === "string"
        ? asaasData.errors[0].description
        : typeof asaasData?.message === "string"
        ? asaasData.message
        : undefined;
      return jsonRes({
        error: detalhe ?? "erro ao criar a subconta no Asaas",
        detail: asaasData,
      }, 502);
    }

    const walletId = asaasData?.walletId;
    const accountId = asaasData?.id;
    if (!walletId || !accountId) {
      return jsonRes({ error: "Asaas não retornou walletId/id da subconta", detail: asaasData }, 502);
    }

    // Guarda a apiKey da subconta antes de qualquer outra coisa: o Asaas só a
    // devolve nesta resposta e nunca mais. Perdê-la significa perder o único
    // caminho de consulta de aprovação.
    const apiKeySubconta = asaasData?.accessToken?.apiKey ?? asaasData?.apiKey ?? null;
    let apiKeyGuardada = false;
    if (apiKeySubconta) {
      const { error: vaultError } = await supabase.rpc("asaas_guardar_apikey_subconta", {
        p_medico_id: medicoId,
        p_api_key: apiKeySubconta,
      });
      if (vaultError) {
        console.error(`Falha ao guardar a apiKey da subconta do médico ${medicoId}:`, vaultError.message);
      } else {
        apiKeyGuardada = true;
      }
    } else {
      console.error(`Asaas não devolveu apiKey para a subconta do médico ${medicoId}.`);
    }

    const onboardingUrl = asaasData?.onboardingUrl ?? null;
    const { error: updateError } = await supabase
      .from("medicos")
      .update({
        asaas_account_id: accountId,
        asaas_wallet_id: walletId,
        asaas_onboarding_url: onboardingUrl,
        // O Asaas ainda vai analisar documentos: só ACCOUNT_STATUS_..._APPROVED
        // (ou asaas-subconta-status) pode marcar como aprovado.
        asaas_onboarding_status: onboardingUrl ? "pendente_documentos" : "em_analise",
        asaas_conta_criada_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", medicoId);

    if (updateError) {
      // A subconta existe no Asaas mas não ficou vinculada aqui. Devolver os
      // identificadores torna a situação recuperável em vez de órfã.
      return jsonRes({
        error: "subconta criada no Asaas mas não vinculada ao médico",
        detail: updateError.message,
        walletId,
        accountId,
      }, 500);
    }

    return jsonRes({
      ok: true,
      walletId,
      accountId,
      onboardingUrl,
      onboardingStatus: onboardingUrl ? "pendente_documentos" : "em_analise",
      // Sem estes dois, a aprovação nunca chega — quem chamou precisa saber.
      webhookRegistrado: podeRegistrarWebhook,
      apiKeyGuardada,
    });
  } catch (e) {
    return jsonRes({ error: "internal", detail: (e as Error).message }, 500);
  }
});
