import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Página de retorno do DocuSign (`returnUrl` do recipient view).
 *
 * O paciente assina no navegador externo e o DocuSign o redireciona para cá.
 * Precisa ser pública (`verify_jwt = false`) — o navegador não carrega sessão.
 * Um deep link não registrado (`canfy://...`) deixava a aba carregando para
 * sempre; esta página encerra o fluxo com uma mensagem.
 *
 * Serve TEXTO PURO de propósito: o gateway das Edge Functions força
 * `Content-Type: text/plain` + `nosniff` em GET, então HTML apareceria como
 * código-fonte na tela. Sem charset o navegador assume latin-1, por isso o
 * texto é ASCII (sem acentos) — caso contrário sai "concluAda".
 *
 * Para uma página com a marca da Canfy, aponte o secret DOCUSIGN_RETURN_URL
 * para `https://<dominio-do-painel>/assinatura-concluida`, que já existe no
 * canfy-web e não sofre essa limitação.
 */

const MENSAGENS: Record<string, string> = {
  signing_complete:
    "Assinatura concluida com sucesso.\n\n" +
    "Sua procuracao foi assinada. Volte ao aplicativo Canfy e toque em " +
    '"Ja assinei" para continuar o seu pedido.',
  cancel:
    "Assinatura cancelada.\n\n" +
    "Voce saiu sem assinar. Volte ao aplicativo Canfy para tentar novamente " +
    "ou seguir sem a procuracao.",
  decline:
    "Assinatura recusada.\n\n" +
    "Volte ao aplicativo Canfy para tentar novamente ou seguir sem a procuracao.",
  ttl_expired:
    "Link de assinatura expirado.\n\n" +
    "Volte ao aplicativo Canfy e inicie a assinatura novamente.",
};

const PADRAO =
  "Assinatura nao concluida.\n\n" +
  "Nao conseguimos confirmar a assinatura. Volte ao aplicativo Canfy para " +
  "tentar novamente ou seguir sem a procuracao.";

Deno.serve((req: Request) => {
  const event = new URL(req.url).searchParams.get("event") ?? "";
  const mensagem = MENSAGENS[event] ?? PADRAO;

  return new Response(`Canfy\n\n${mensagem}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
