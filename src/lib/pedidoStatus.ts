// Fonte única de verdade para apresentação dos status de pedido (módulo 20).
// O enum `status_pedido` do banco tem 8 valores; o Figma agrupa em rótulos exibidos
// com cores próprias e numa linha do tempo de 5 etapas.

export type StatusPedido =
  | "pendente"
  | "aprovado"
  | "em_analise"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "recusado"
  | "cancelado";

export interface StatusBadge {
  label: string;
  /** cor de fundo do badge (token --card-*) */
  bg: string;
  /** cor do texto do badge */
  fg: string;
}

export const STATUS_PEDIDO_BADGE: Record<string, StatusBadge> = {
  pendente: { label: "Aprovação pendente", bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  aprovado: { label: "Em andamento", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  em_analise: { label: "Em andamento", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  em_separacao: { label: "Em andamento", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  enviado: { label: "Enviado", bg: "hsl(var(--card-purple))", fg: "hsl(291 47% 35%)" },
  entregue: { label: "Finalizado", bg: "hsl(var(--card-green))", fg: "hsl(var(--primary-dark))" },
  recusado: { label: "Reprovado", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
  cancelado: { label: "Cancelado", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
};

export const getStatusBadge = (status: string): StatusBadge =>
  STATUS_PEDIDO_BADGE[status] ?? { label: status, bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };

// Grupos do modal de filtro (Figma): cada checkbox seleciona um conjunto de status do banco.
export const FILTRO_STATUS_GRUPOS: { key: string; label: string; statuses: StatusPedido[] }[] = [
  { key: "pendente", label: "Aprovação pendente", statuses: ["pendente"] },
  { key: "andamento", label: "Em andamento", statuses: ["aprovado", "em_analise", "em_separacao"] },
  { key: "finalizado", label: "Finalizado", statuses: ["entregue"] },
  { key: "reprovado", label: "Reprovado", statuses: ["recusado", "cancelado"] },
];

// Linha do tempo do detalhe (20.1): 5 etapas baseadas no status do pedido.
export const TIMELINE_STAGES = [
  "Pendente de aprovação",
  "Aprovado",
  "Em andamento",
  "Enviado",
  "Finalizado",
] as const;

/** Índice da etapa atingida na linha do tempo a partir do status. -1 não atinge nenhuma. */
export const timelineStageIndex = (status: string): number => {
  switch (status) {
    case "pendente":
      return 0;
    case "recusado":
    case "cancelado":
    case "aprovado":
      return 1;
    case "em_analise":
    case "em_separacao":
      return 2;
    case "enviado":
      return 3;
    case "entregue":
      return 4;
    default:
      return 0;
  }
};

/** Rótulo da etapa 1 muda quando o pedido é reprovado/cancelado. */
export const isPedidoReprovado = (status: string) =>
  status === "recusado" || status === "cancelado";

// Status da própria receita (enum `status_receita`: ativa | utilizada | expirada | cancelada).
// Conceito distinto do status do pedido; mantido aqui como fonte única de apresentação.
export const STATUS_RECEITA_BADGE: Record<string, StatusBadge> = {
  ativa: { label: "Ativa", bg: "hsl(var(--card-green))", fg: "hsl(var(--primary-dark))" },
  utilizada: { label: "Utilizada", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  expirada: { label: "Expirada", bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  cancelada: { label: "Cancelada", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
};

export const getReceitaStatusBadge = (status: string): StatusBadge =>
  STATUS_RECEITA_BADGE[status] ?? { label: status, bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };
