import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserFriendlyError } from "@/lib/errorUtils";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";

const RESEND_COOLDOWN_S = 60;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendLink = async () => {
    if (!email.trim()) {
      toast({ title: "Informe seu e-mail", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setSent(true);
      startCooldown();
    } catch (error) {
      toast({
        title: "Erro ao enviar link",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendLink();
  };

  if (sent) {
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
              Um link de recuperação foi enviado
              <br />
              para o seu email
            </h2>
          </div>

          <div className="flex w-full max-w-[390px] flex-col items-center gap-2">
            <Button
              onClick={handleSendLink}
              disabled={cooldown > 0 || isLoading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium disabled:opacity-30"
            >
              {cooldown > 0 ? `Reenviar email (${cooldown}s)` : "Reenviar email"}
            </Button>
            <Link
              to="/entrar"
              className="text-sm font-semibold text-primary-dark hover:underline py-2"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <img src={logo} alt="Canfy" className="h-11" />

        <div className="text-center space-y-1">
          <h2 className="font-display text-4xl font-semibold text-foreground">
            Recuperação de senha
          </h2>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-8">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
              E-mail ou telefone
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                placeholder="Insira seu e-mail ou telefone"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-11 w-full rounded-full bg-card border-border"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full max-w-[390px] h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium"
            >
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <Link
              to="/entrar"
              className="text-sm font-semibold text-primary-dark hover:underline py-2"
            >
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
