import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Página HTTPS de retorno do DocuSign (`returnUrl` do recipient view).
 *
 * O paciente assina no navegador externo e o DocuSign o redireciona para cá.
 * Precisa ser pública (`verify_jwt = false`) — o navegador não carrega sessão.
 * Um deep link não registrado (`canfy://...`) deixava a aba carregando para
 * sempre; esta página encerra o fluxo com uma mensagem.
 *
 * Vive numa Edge Function para não depender do deploy do painel web. Para usar
 * uma página com a marca da Canfy, basta apontar o secret DOCUSIGN_RETURN_URL
 * para `https://<dominio-do-painel>/assinatura-concluida`.
 */

const MENSAGENS: Record<string, { titulo: string; texto: string; ok: boolean }> = {
  signing_complete: {
    titulo: "Assinatura concluída",
    texto:
      "Sua procuração foi assinada com sucesso. Você já pode voltar ao aplicativo Canfy e tocar em “Já assinei” para continuar o seu pedido.",
    ok: true,
  },
  cancel: {
    titulo: "Assinatura cancelada",
    texto:
      "Você saiu sem assinar. Volte ao aplicativo Canfy para tentar novamente ou seguir sem a procuração.",
    ok: false,
  },
  decline: {
    titulo: "Assinatura recusada",
    texto:
      "A assinatura foi recusada. Volte ao aplicativo Canfy para tentar novamente ou seguir sem a procuração.",
    ok: false,
  },
  ttl_expired: {
    titulo: "Link expirado",
    texto:
      "O link de assinatura expirou. Volte ao aplicativo Canfy e inicie a assinatura novamente.",
    ok: false,
  },
};

const PADRAO = {
  titulo: "Assinatura não concluída",
  texto:
    "Não conseguimos confirmar a assinatura. Volte ao aplicativo Canfy para tentar novamente ou seguir sem a procuração.",
  ok: false,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve((req: Request) => {
  const event = new URL(req.url).searchParams.get("event") ?? "";
  const { titulo, texto, ok } = MENSAGENS[event] ?? PADRAO;
  const cor = ok ? "#1f9d55" : "#6b7280";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canfy - ${escapeHtml(titulo)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px; background: #f6f7f8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111827;
  }
  .card {
    background: #fff; border-radius: 16px; padding: 40px 24px; max-width: 420px;
    width: 100%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,.06);
  }
  .icone {
    width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 24px;
    background: ${cor}; color: #fff; font-size: 36px; line-height: 72px;
  }
  h1 { font-size: 20px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.5; color: #4b5563; margin: 0; }
</style>
</head>
<body>
  <main class="card">
    <div class="icone" aria-hidden="true">${ok ? "&#10003;" : "!"}</div>
    <h1>${escapeHtml(titulo)}</h1>
    <p>${escapeHtml(texto)}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
