// Fonte única de verdade para apresentação dos status de consulta.
// O enum `status_consulta` do banco tem 5 valores. Rótulos "Realizada" e "Não confirmada"
// seguem o que o app mobile já mostra ao paciente (consultations_page.dart / patient_service.dart),
// para admin e paciente falarem o mesmo nome da mesma coisa.

export type StatusConsulta =
  | "agendada"
  | "em_andamento"
  | "finalizada"
  | "cancelada"
  | "expirada";

export interface StatusBadge {
  label: string;
  /** cor de fundo do badge (token --card-*) */
  bg: string;
  /** cor do texto do badge */
  fg: string;
}

export const STATUS_CONSULTA_BADGE: Record<string, StatusBadge> = {
  agendada: { label: "Agendada", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  em_andamento: { label: "Em andamento", bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  finalizada: { label: "Realizada", bg: "hsl(var(--card-green))", fg: "hsl(var(--primary-dark))" },
  cancelada: { label: "Cancelada", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
  expirada: { label: "Não confirmada", bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" },
};

export const getConsultaStatusBadge = (status: string): StatusBadge =>
  STATUS_CONSULTA_BADGE[status] ?? { label: status, bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };

export const STATUS_CONSULTA_OPCOES: { value: StatusConsulta; label: string }[] = [
  { value: "agendada", label: "Agendada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "finalizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "expirada", label: "Não confirmada" },
];
