import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as jose from "npm:jose@5.2.0";
import { KEYUTIL } from "npm:jsrsasign@10.9.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const DOCUSIGN_DEMO = Deno.env.get("DOCUSIGN_DEMO") !== "false";
const DS_AUTH_SERVER = DOCUSIGN_DEMO
  ? "account-d.docusign.com"
  : "account.docusign.com";
const DS_API_BASE = DOCUSIGN_DEMO
  ? "https://demo.docusign.net"
  : "https://www.docusign.net";

/**
 * Página HTTPS de retorno após a assinatura. Precisa ser um endereço que o
 * navegador consiga abrir — um esquema de deep link não registrado deixa a aba
 * carregando para sempre.
 */
const DEFAULT_RETURN_URL =
  Deno.env.get("DOCUSIGN_RETURN_URL") ??
  "https://agqqxxfrnpuriwrmwdrq.supabase.co/functions/v1/docusign-retorno";

/** Página do documento (Letter, 72dpi) e margens usadas na procuração. */
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
/** Posição (a partir da base da página) da linha de assinatura. */
const SIGN_LINE_Y = 150;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: object, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors, ...extraHeaders },
  });
}

type ProcuracaoData = {
  nome?: string;
  nacionalidade?: string;
  cpf?: string;
  rg?: string;
  endereco?: string;
  numero?: string;
  cep?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
};

/**
 * Normaliza um campo vindo do app: corta espaços, limita o tamanho e remove
 * caracteres fora do WinAnsi (Helvetica não os codifica e o pdf-lib lançaria erro).
 */
function sanitize(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n\t]+/g, " ")
    // deno-lint-ignore no-control-regex
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim()
    .slice(0, maxLength);
}

/** Quebra o texto em linhas que cabem na largura disponível. */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Gera o PDF da procuração Canfy com os dados preenchidos pelo paciente. */
async function gerarProcuracaoPdf(dados: ProcuracaoData, signerName: string): Promise<string> {
  const nome = sanitize(dados.nome) || sanitize(signerName) || "____________________";
  const nacionalidade = sanitize(dados.nacionalidade, 40) || "brasileiro(a)";
  const cpf = sanitize(dados.cpf, 20) || "____________";
  const rg = sanitize(dados.rg, 20) || "____________";
  const endereco = sanitize(dados.endereco) || "____________________";
  const numero = sanitize(dados.numero, 10) || "s/n";
  const bairro = sanitize(dados.bairro, 60) || "____________";
  const cidade = sanitize(dados.cidade, 60) || "____________";
  const estado = sanitize(dados.estado, 40) || "__";
  const cep = sanitize(dados.cep, 12) || "____________";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - MARGIN * 2;

  let y = PAGE_HEIGHT - MARGIN;

  const titulo = "PROCURAÇÃO";
  page.drawText(titulo, {
    x: (PAGE_WIDTH - fontBold.widthOfTextAtSize(titulo, 16)) / 2,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  const corpo =
    `Pelo presente instrumento particular de procuração, ${nome}, ${nacionalidade}, ` +
    `portador(a) do CPF nº ${cpf} e do RG nº ${rg}, residente e domiciliado(a) em ` +
    `${endereco}, nº ${numero}, bairro ${bairro}, ${cidade}/${estado}, CEP ${cep}, ` +
    `nomeia e constitui como sua bastante procuradora a CANFY, conferindo-lhe poderes ` +
    `para representá-lo(a) perante associações de pacientes, a ANVISA, fornecedores e ` +
    `demais órgãos públicos e privados, podendo requerer autorizações de importação e ` +
    `aquisição de produtos à base de cannabis medicinal, assinar requerimentos e ` +
    `declarações, acompanhar processos, receber e retirar produtos, bem como praticar ` +
    `todos os demais atos necessários ao fiel cumprimento deste mandato.`;

  for (const linha of wrapText(corpo, font, 11, maxWidth)) {
    page.drawText(linha, { x: MARGIN, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 18;
  }

  y -= 18;
  const dataExtenso = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.drawText(sanitize(`${cidade}, ${dataExtenso}.`, 120), {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: MARGIN, y: SIGN_LINE_Y },
    end: { x: PAGE_WIDTH - MARGIN, y: SIGN_LINE_Y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText(sanitize(`${nome} - Outorgante`, 140), {
    x: MARGIN,
    y: SIGN_LINE_Y - 16,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  return await pdf.saveAsBase64();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      returnUrl?: string;
      procuracao?: ProcuracaoData;
    };
    const returnUrl = body.returnUrl ?? DEFAULT_RETURN_URL;

    const integrationKey = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
    const userId = Deno.env.get("DOCUSIGN_USER_ID");
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const privateKeyPem = Deno.env.get("DOCUSIGN_PRIVATE_KEY");

    if (!integrationKey || !userId || !accountId || !privateKeyPem) {
      return jsonResponse(
        {
          error: "DocuSign not configured",
          hint: "Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_PRIVATE_KEY in Edge Function secrets",
        },
        503
      );
    }

    const signerEmail = user.email ?? "";
    const signerName = user.user_metadata?.["full_name"] ?? user.email ?? "Signer";
    if (!signerEmail) {
      return jsonResponse({ error: "User email is required for signing" }, 400);
    }

    let pemNormalized = privateKeyPem.replace(/\\n/g, "\n").trim();
    if (pemNormalized.includes("RSA PRIVATE KEY")) {
      try {
        const keyObj = KEYUTIL.getKey(pemNormalized);
        const pkcs8Pem = KEYUTIL.getPEM(keyObj, "PKCS8PRV");
        pemNormalized = pkcs8Pem;
      } catch (e) {
        console.error("PKCS#1 to PKCS#8 conversion failed", e);
        return jsonResponse(
          { error: "Invalid private key: could not convert to PKCS#8. Use a PKCS#8 key or paste the RSA key from DocuSign." },
          400
        );
      }
    }

    const key = await jose.importPKCS8(pemNormalized, "RS256");
    const jwt = await new jose.SignJWT({ scope: "signature impersonation" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(integrationKey)
      .setSubject(userId)
      .setAudience(DOCUSIGN_DEMO ? "account-d.docusign.com" : "account.docusign.com")
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(key);

    const tokenRes = await fetch(`https://${DS_AUTH_SERVER}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("DocuSign token error", tokenRes.status, errText);
      return jsonResponse(
        { error: "DocuSign auth failed", details: errText },
        502
      );
    }
    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      base_uri?: string;
    };
    const accessToken = tokenData.access_token;
    const baseUri = (tokenData.base_uri ?? DS_API_BASE).replace(/\/$/, "");

    const documentBase64 = await gerarProcuracaoPdf(body.procuracao ?? {}, signerName);

    const clientUserId = user.id;
    const envelopePayload = {
      status: "sent",
      emailSubject: "Canfy - Procuração para assinatura",
      documents: [
        {
          documentBase64,
          name: "procuracao-canfy.pdf",
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: "1",
            clientUserId,
            tabs: {
              signHereTabs: [
                {
                  documentId: "1",
                  pageNumber: "1",
                  recipientId: "1",
                  // Tabs do DocuSign são medidas a partir do topo da página.
                  xPosition: String(MARGIN),
                  yPosition: String(PAGE_HEIGHT - SIGN_LINE_Y - 30),
                },
              ],
            },
          },
        ],
      },
    };

    const createEnvRes = await fetch(
      `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envelopePayload),
      }
    );
    if (!createEnvRes.ok) {
      const errText = await createEnvRes.text();
      console.error("DocuSign create envelope error", createEnvRes.status, errText);
      return jsonResponse(
        { error: "Failed to create envelope", details: errText },
        502
      );
    }
    const envData = (await createEnvRes.json()) as { envelopeId: string };
    const envelopeId = envData.envelopeId;

    // Registra o envelope para que o webhook do DocuSign consiga atualizar o
    // status depois. Falha aqui não impede a assinatura.
    const { error: insertError } = await supabase.from("docusign_envelopes").insert({
      envelope_id: envelopeId,
      user_id: user.id,
      status: "sent",
    });
    if (insertError) {
      console.error("docusign_envelopes insert error", envelopeId, insertError);
    }

    const viewPayload = {
      returnUrl,
      authenticationMethod: "none",
      email: signerEmail,
      userName: signerName,
      clientUserId,
    };
    const viewRes = await fetch(
      `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(viewPayload),
      }
    );
    if (!viewRes.ok) {
      const errText = await viewRes.text();
      console.error("DocuSign recipient view error", viewRes.status, errText);
      return jsonResponse(
        { error: "Failed to get signing URL", details: errText },
        502
      );
    }
    const viewData = (await viewRes.json()) as { url: string };
    return jsonResponse({ url: viewData.url, envelopeId }, 200);
  } catch (e) {
    console.error("docusign-signing-url error", e);
    return jsonResponse(
      { error: String(e instanceof Error ? e.message : e) },
      500
    );
  }
});
