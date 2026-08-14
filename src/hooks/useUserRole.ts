import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

interface UseUserRoleResult {
  loading: boolean;
  session: Session | null;
  role: AppRole | null;
  temAcessoPainel: boolean;
}

export const useUserRole = (): UseUserRoleResult => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregarPapel = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (ativo) {
          setSession(null);
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentSession.user.id)
        .limit(1)
        .maybeSingle();

      if (!ativo) return;

      setSession(currentSession);
      setRole(error ? null : (data?.role ?? null));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      carregarPapel(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true);
      carregarPapel(newSession);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  return { loading, session, role, temAcessoPainel: role !== null };
};
