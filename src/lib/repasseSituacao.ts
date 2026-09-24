// Fonte única de apresentação da SITUAÇÃO de um repasse.
//
// repasses_medicos.status só tem 3 valores (pendente|efetuado|cancelado) e o
// "pendente" mistura duas coisas que o administrativo precisa separar:
//   - o paciente ainda não pagou      -> não há dinheiro, não há o que fazer;
//   - a Canfy já recebeu e o repasse   -> há dinheiro parado que vai sair;
//   - o repasse não sai sozinho        -> exige ação (carteira, divergência).
//
// A situacao vem derivada no banco (public.repasse_situacao) e é o que a UI
// exibe. O equivalente no app do médico é
// canfy-mobile/lib/constants/repasse_situacao.dart — os dois contam a mesma
// história, mudando só a perspectiva (receber vs. pagar).

export type SituacaoRepasse =
  | "aguardando_pagamento"
  | "a_transferir"
  | "em_transferencia"
  | "pago"
  | "cancelado"
  | "pendencia";

export interface SituacaoBadge {
  label: string;
  /** Uma linha explicando o que o administrativo deve entender/fazer. */
  ajuda: string;
  bg: string;
  fg: string;
}

export const SITUACAO_REPASSE_BADGE: Record<SituacaoRepasse, SituacaoBadge> = {
  aguardando_pagamento: {
    label: "Aguardando paciente",
    ajuda: "A cobrança de origem ainda não foi paga. Não é obrigação da Canfy ainda.",
    bg: "hsl(var(--muted))",
    fg: "hsl(var(--muted-foreground))",
  },
  a_transferir: {
    label: "A transferir",
    ajuda: "O paciente pagou. O valor está na conta Canfy e precisa ser repassado.",
    bg: "hsl(var(--card-blue))",
    fg: "hsl(222 47% 35%)",
  },
  em_transferencia: {
    label: "Em processamento",
    ajuda: "Split ou transferência em curso no Asaas.",
    bg: "hsl(var(--card-blue))",
    fg: "hsl(222 47% 35%)",
  },
  pago: {
    label: "Pago",
    ajuda: "Creditado na conta do médico. Custo realizado.",
    bg: "hsl(var(--card-green))",
    fg: "hsl(var(--primary-dark))",
  },
  cancelado: {
    label: "Cancelado",
    ajuda: "A cobrança de origem foi cancelada ou estornada; o repasse foi revertido.",
    bg: "hsl(var(--card-yellow))",
    fg: "hsl(36 80% 38%)",
  },
  pendencia: {
    label: "Ação necessária",
    ajuda: "Este repasse NÃO sai sozinho: médico sem carteira, split recusado ou divergência.",
    bg: "hsl(var(--card-red))",
    fg: "hsl(var(--destructive))",
  },
};

export const getSituacaoBadge = (situacao: string | null | undefined): SituacaoBadge =>
  SITUACAO_REPASSE_BADGE[(situacao ?? "") as SituacaoRepasse] ?? {
    label: situacao ?? "—",
    ajuda: "",
    bg: "hsl(var(--muted))",
    fg: "hsl(var(--muted-foreground))",
  };

/** Ordem dos KPIs: o que exige ação primeiro, histórico por último. */
export const SITUACOES_ORDENADAS: SituacaoRepasse[] = [
  "pendencia",
  "a_transferir",
  "em_transferencia",
  "pago",
  "aguardando_pagamento",
  "cancelado",
];

export const SITUACAO_OPCOES: { value: SituacaoRepasse; label: string }[] =
  SITUACOES_ORDENADAS.map((value) => ({
    value,
    label: SITUACAO_REPASSE_BADGE[value].label,
  }));

export const ORIGEM_REPASSE_OPCOES = [
  { value: "pedido", label: "Pedido" },
  { value: "consulta", label: "Consulta" },
] as const;

export const getOrigemLabel = (origem: string | null | undefined): string =>
  origem === "consulta" ? "Consulta" : "Pedido";
