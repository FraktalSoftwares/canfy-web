import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.svg";
import { loginSchema } from "@/lib/validations";
import { getUserFriendlyError, getValidationError } from "@/lib/errorUtils";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
        toast({
          title: "Erro ao entrar",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
        return;
      }

      if (data.session) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        navigate("/");
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
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-card"
                style={{ width: '480px', height: '44px', borderRadius: '20px', borderColor: '#00994B' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-normal text-foreground">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Insira sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-card"
                style={{ width: '480px', height: '44px', borderRadius: '20px', borderColor: '#00994B' }}
              />
            </div>
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
            className="h-12 text-primary-foreground rounded-full text-base font-medium"
            style={{ backgroundColor: '#00994B', width: '480px' }}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
