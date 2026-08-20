import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export type Modulo = "acessos" | "usuarios" | "receitas" | "produtos" | "associacoes";

interface PermissaoModulo {
  pode_acessar: boolean;
  pode_editar: boolean;
}

interface UsePermissionsResult {
  loading: boolean;
  podeEditar: (modulo: Modulo) => boolean;
  podeAcessar: (modulo: Modulo) => boolean;
}

/**
 * Lê user_permissions do usuário logado e responde se ele pode acessar/editar
 * cada módulo do painel.
 *
 * A semântica é a mesma da função SQL `has_permission` (migração
 * 20260819120200_qa_has_permission.sql), que é quem de fato autoriza no
 * servidor — este hook só evita mostrar controles que resultariam em erro:
 *
 *   - super_admin                     -> sempre permitido
 *   - linha explícita para o módulo   -> a linha decide
 *   - nenhuma linha para o módulo     -> cai no comportamento anterior (role de
 *                                        painel permite), para não travar os
 *                                        admins que nunca tiveram permissões
 *                                        configuradas
 */
export const usePermissions = (): UsePermissionsResult => {
  const { loading: loadingRole, session, role } = useUserRole();
  const [permissoes, setPermissoes] = useState<Record<string, PermissaoModulo> | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      if (!session) {
        if (ativo) {
          setPermissoes(null);
          setLoadingPerms(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_permissions")
        .select("modulo, pode_acessar, pode_editar")
        .eq("user_id", session.user.id);

      if (!ativo) return;

      const mapa: Record<string, PermissaoModulo> = {};
      for (const linha of data ?? []) {
        mapa[linha.modulo] = {
          pode_acessar: !!linha.pode_acessar,
          pode_editar: !!linha.pode_editar,
        };
      }
      setPermissoes(error ? null : mapa);
      setLoadingPerms(false);
    };

    if (!loadingRole) {
      setLoadingPerms(true);
      carregar();
    }

    return () => {
      ativo = false;
    };
  }, [loadingRole, session]);

  const avaliar = (modulo: Modulo, acao: "pode_editar" | "pode_acessar"): boolean => {
    if (role === "super_admin") return true;
    const linha = permissoes?.[modulo];
    if (linha) return linha[acao];
    // Sem linha configurada: mantém o comportamento anterior.
    return role === "admin";
  };

  return {
    loading: loadingRole || loadingPerms,
    podeEditar: (modulo) => avaliar(modulo, "pode_editar"),
    podeAcessar: (modulo) => avaliar(modulo, "pode_acessar"),
  };
};
