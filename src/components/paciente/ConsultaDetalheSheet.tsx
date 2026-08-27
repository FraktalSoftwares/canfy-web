import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getConsultaStatusBadge } from "@/lib/consultaStatus";
import type { ConsultaHistoricoRow } from "./ConsultasHistorico";

interface ConsultaDetalheSheetProps {
  consulta: ConsultaHistoricoRow | null;
  onOpenChange: (open: boolean) => void;
}

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
};

function Bloco({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= nota ? "fill-status-warning text-status-warning" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

export function ConsultaDetalheSheet({ consulta, onOpenChange }: ConsultaDetalheSheetProps) {
  if (!consulta) return null;
  const badge = getConsultaStatusBadge(consulta.status);

  return (
    <Sheet open={!!consulta} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              className="border-none rounded-full"
              style={{ backgroundColor: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </Badge>
            {consulta.eh_retorno && (
              <Badge className="border-none rounded-full bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple">
                Retorno
              </Badge>
            )}
          </div>
          <SheetTitle className="text-lg">{formatDateTime(consulta.data_consulta)}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <Bloco label="Médico">
            {consulta.medico_nome
              ? `${consulta.medico_nome}${consulta.medico_crm ? ` — CRM ${consulta.medico_crm}-${consulta.medico_uf_crm ?? ""}` : ""}`
              : "Ainda não atribuído"}
          </Bloco>

          <Bloco label="Queixa principal">{consulta.queixa_principal || "—"}</Bloco>

          {consulta.sintomas && consulta.sintomas.length > 0 && (
            <Bloco label="Sintomas">
              <div className="flex flex-wrap gap-1.5">
                {consulta.sintomas.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </Bloco>
          )}

          {consulta.resumo_atendimento && (
            <Bloco label="Resumo do atendimento">{consulta.resumo_atendimento}</Bloco>
          )}

          {consulta.cancelada_em && (
            <Bloco label="Cancelamento">
              <p>{formatDateTime(consulta.cancelada_em)}{consulta.cancelada_por ? ` — por ${consulta.cancelada_por}` : ""}</p>
              {consulta.motivo_cancelamento && (
                <p className="text-muted-foreground mt-0.5">{consulta.motivo_cancelamento}</p>
              )}
            </Bloco>
          )}

          {consulta.reembolsada_em && (
            <Bloco label="Reembolso">{formatDateTime(consulta.reembolsada_em)}</Bloco>
          )}

          {consulta.feedback_nota != null && (
            <Bloco label="Avaliação do paciente sobre a consulta">
              <div className="flex items-center gap-2 mb-1">
                <Estrelas nota={consulta.feedback_nota} />
              </div>
              {consulta.feedback_comentario && (
                <p className="text-muted-foreground">{consulta.feedback_comentario}</p>
              )}
            </Bloco>
          )}

          {consulta.avaliacao_medico_nota != null && (
            <Bloco label="Avaliação do médico sobre o paciente">
              <div className="flex items-center gap-2 mb-1">
                <Estrelas nota={consulta.avaliacao_medico_nota} />
              </div>
              {consulta.avaliacao_medico_comentario && (
                <p className="text-muted-foreground">{consulta.avaliacao_medico_comentario}</p>
              )}
            </Bloco>
          )}

          {consulta.receita_id && (
            <Bloco label="Receita gerada">
              <Link
                to={`/receitas/${consulta.receita_id}`}
                className="text-primary hover:text-primary-dark font-medium hover:underline"
              >
                Ver receita {consulta.numero_receita ? `#${consulta.numero_receita}` : ""}
              </Link>
            </Bloco>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
