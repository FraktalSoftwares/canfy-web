// Fonte única de verdade para apresentação do status de repasse (repasses_medicos.status).
// Enum tem 3 valores fixos: pendente | efetuado | cancelado.

export type StatusRepasse = "pendente" | "efetuado" | "cancelado";

export interface StatusBadge {
  label: string;
  bg: string;
  fg: string;
}

export const STATUS_REPASSE_BADGE: Record<string, StatusBadge> = {
  pendente: { label: "Pendente", bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  efetuado: { label: "Efetuado", bg: "hsl(var(--card-green))", fg: "hsl(var(--primary-dark))" },
  cancelado: { label: "Cancelado", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
};

export const getRepasseStatusBadge = (status: string): StatusBadge =>
  STATUS_REPASSE_BADGE[status] ?? { label: status, bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };

export const STATUS_REPASSE_OPCOES: { value: StatusRepasse; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "efetuado", label: "Efetuado" },
  { value: "cancelado", label: "Cancelado" },
];
