import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-8" style={{ color: '#00994B' }}>Canfy</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Esqueceu sua senha?
          </h2>
          <p className="text-muted-foreground">
            Digite seu e-mail ou telefone para recuperar sua senha.
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

          <Button
            type="submit"
            className="w-full h-12 text-primary-foreground rounded-full text-base font-medium"
            style={{ backgroundColor: '#00994B', maxWidth: '480px' }}
          >
            Enviar link de recuperação
          </Button>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-accent hover:underline"
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
