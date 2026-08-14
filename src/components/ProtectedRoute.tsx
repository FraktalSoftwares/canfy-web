import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading, session, temAcessoPainel } = useUserRole();
  const semAcesso = !loading && !!session && !temAcessoPainel;

  useEffect(() => {
    if (semAcesso) {
      supabase.auth.signOut();
    }
  }, [semAcesso]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!session) {
    return <Navigate to="/entrar" replace />;
  }

  // Authenticated but without an admin-panel role - sign out and redirect
  if (semAcesso) {
    return <Navigate to="/entrar" state={{ semAcesso: true }} replace />;
  }

  // Authenticated - render children
  return <>{children}</>;
};
