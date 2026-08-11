import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Lock, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserFriendlyError } from "@/lib/errorUtils";
import logo from "@/assets/logo-wordmark.svg";

type Estado = "verificando" | "form" | "invalido" | "sucesso";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O Supabase detecta o token de recuperação na URL e emite PASSWORD_RECOVERY.
  // Se, após verificar, não houver sessão válida, o link é inválido/expirado.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setEstado("form");
    });

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setEstado(data.session ? "form" : "invalido");
    };
    const timeout = setTimeout(checkSession, 800);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const validar = () => {
    if (novaSenha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return false;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return false;
    }
    setErro(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      await supabase.auth.signOut();
      setEstado("sucesso");
    } catch (error) {
      setErro(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (estado === "verificando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Verificando link...</p>
      </div>
    );
  }

  if (estado === "invalido") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card-red">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Link inválido ou expirado
          </h2>
          <p className="text-sm text-muted-foreground">
            Solicite um novo link de recuperação de senha para continuar.
          </p>
          <Button
            onClick={() => navigate("/esqueci-senha")}
            className="w-full max-w-[390px] h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium"
          >
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  if (estado === "sucesso") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-card-green">
              <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-primary-hover">
                <Check className="h-9 w-9 text-white" strokeWidth={3} />
              </div>
            </div>
            <h2 className="font-display text-4xl font-semibold text-foreground">
              Sua senha foi atualizada com sucesso
            </h2>
          </div>

          <div className="flex w-full max-w-[390px] flex-col items-center gap-2">
            <Button
              onClick={() => navigate("/entrar")}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium"
            >
              Ir para o login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const senhasNaoCoincidem = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <img src={logo} alt="Canfy" className="h-11" />

        <div className="text-center space-y-1">
          <h2 className="font-display text-4xl font-semibold text-foreground">
            Defina sua nova senha
          </h2>
          <p className="text-sm text-muted-foreground">
            Tudo certo! Agora é só definir uma nova senha para acessar sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="space-y-2">
            <Label htmlFor="nova-senha" className="text-sm font-semibold text-foreground">
              Insira a senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <PasswordInput
                id="nova-senha"
                placeholder="Insira sua senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pl-11 h-11 w-full rounded-full bg-card border-border"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="confirmar-senha" className="text-sm font-semibold text-foreground">
              Confirmar senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <PasswordInput
                id="confirmar-senha"
                placeholder="Confirme sua nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={`pl-11 h-11 w-full rounded-full bg-card ${
                  senhasNaoCoincidem ? "border-destructive bg-destructive/5" : "border-border"
                }`}
              />
            </div>
            {erro && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {erro}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 pt-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full max-w-[390px] h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium"
            >
              {isLoading ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
