import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertTriangle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-wordmark.svg";
import { loginSchema } from "@/lib/validations";
import { getUserFriendlyError, getValidationError } from "@/lib/errorUtils";

const SEM_ACESSO_MENSAGEM = "Esta conta não tem acesso ao painel administrativo.";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if ((location.state as { semAcesso?: boolean } | null)?.semAcesso) {
      toast({
        title: "Acesso negado",
        description: SEM_ACESSO_MENSAGEM,
        variant: "destructive",
      });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError(null);
    setPasswordError(null);

    try {
      // Validate input
      const validatedData = loginSchema.parse({
        email: email.trim(),
        password,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setEmailError("E-mail incorreto");
          setPasswordError("Senha incorreta");
        } else {
          toast({
            title: "Erro ao entrar",
            description: getUserFriendlyError(error),
            variant: "destructive",
          });
        }
        return;
      }

      if (data.session) {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .limit(1);

        if (rolesError || !roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: SEM_ACESSO_MENSAGEM,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        navigate("/home");
      }
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        toast({
          title: "Erro de validação",
          description: getValidationError(error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao entrar",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img src={logo} alt="Canfy" className="mx-auto mb-8 h-12" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Bem-vindo de volta!
          </h2>
          <p className="text-muted-foreground">
            Entre para continuar sua jornada.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-normal text-foreground">
              E-mail ou telefone
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                placeholder="Insira seu e-mail ou telefone"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                className={`pl-10 h-11 w-full rounded-[20px] bg-card ${
                  emailError ? "border-destructive bg-destructive/5" : "border-primary"
                }`}
              />
            </div>
            {emailError && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-normal text-foreground">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <PasswordInput
                id="password"
                placeholder="Insira sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                className={`pl-10 h-11 w-full rounded-[20px] bg-card ${
                  passwordError ? "border-destructive bg-destructive/5" : "border-primary"
                }`}
              />
            </div>
            {passwordError && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {passwordError}
              </p>
            )}
          </div>

          <div>
            <Link
              to="/esqueci-senha"
              className="text-sm text-accent hover:underline"
            >
              Esqueceu sua senha?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full text-base font-medium"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
