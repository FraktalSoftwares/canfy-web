import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const QUERY_KEY = ["notificacoes", "nao-lidas"] as const;

export const useNotificacoesNaoLidas = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase.rpc("contar_notificacoes_nao_lidas");
      if (error) return 0;
      return data ?? 0;
    },
  });
};

export const useInvalidarNotificacoesNaoLidas = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
};
