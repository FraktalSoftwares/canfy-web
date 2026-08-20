import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Página de retorno do DocuSign após a assinatura da procuração.
 *
 * É o `returnUrl` do recipient view: o paciente assina no navegador e o DocuSign
 * o redireciona para cá. Precisa ser pública — o navegador externo não tem sessão.
 * O DocuSign anexa o parâmetro `event` à URL.
 */
const AssinaturaConcluida = () => {
  const [searchParams] = useSearchParams();
  const event = searchParams.get("event");
  const concluida = event === "signing_complete" || event === null;

  const titulo = concluida
    ? "Assinatura concluída"
    : "Assinatura não concluída";
  const mensagem = concluida
    ? "Sua procuração foi assinada com sucesso. Você já pode voltar ao aplicativo Canfy para continuar o seu pedido."
    : "A assinatura não foi finalizada. Volte ao aplicativo Canfy para tentar novamente ou seguir sem assinar agora.";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <Card className="rounded-[10px] bg-secondary border-none max-w-md w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          {concluida ? (
            <CheckCircle2 className="h-16 w-16 text-primary" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          )}
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <p className="text-muted-foreground">{mensagem}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssinaturaConcluida;
