import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getConsultaStatusBadge, STATUS_CONSULTA_OPCOES } from "@/lib/consultaStatus";
import { PeriodoFilter, Periodo } from "@/components/PeriodoFilter";
import { ConsultaDetalheSheet } from "./ConsultaDetalheSheet";

export interface ConsultaHistoricoRow {
  id: string;
  data_consulta: string;
  status: string;
  queixa_principal: string | null;
  sintomas: string[] | null;
  eh_retorno: boolean;
  medico_id: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  medico_uf_crm: string | null;
  receita_id: string | null;
  numero_receita: string | null;
  resumo_atendimento: string | null;
  cancelada_em: string | null;
  cancelada_por: string | null;
  motivo_cancelamento: string | null;
  reembolsada_em: string | null;
  avaliacao_medico_nota: number | null;
  avaliacao_medico_comentario: string | null;
  feedback_nota: number | null;
  feedback_comentario: string | null;
  total_count: number;
}

const ITEMS_PER_PAGE = 20;

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
};

export function ConsultasHistorico({ pacienteId }: { pacienteId: string }) {
  const { toast } = useToast();

  const [consultas, setConsultas] = useState<ConsultaHistoricoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [showFiltroStatus, setShowFiltroStatus] = useState(false);

  const [selecionada, setSelecionada] = useState<ConsultaHistoricoRow | null>(null);

  const fetchConsultas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_list_paciente_consultas", {
        p_paciente_id: pacienteId,
        p_search: searchQuery.trim() || null,
        p_status: filtroStatus.length ? filtroStatus : null,
        p_data_ini: periodo ? periodo.from.toISOString() : null,
        p_data_fim: periodo ? periodo.to.toISOString() : null,
        p_limit: ITEMS_PER_PAGE,
        p_offset: (page - 1) * ITEMS_PER_PAGE,
      });
      if (error) throw error;
      const rows = (data || []) as ConsultaHistoricoRow[];
      setConsultas(rows);
      setTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (e: any) {
      toast({ title: "Erro ao carregar consultas", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, searchQuery, filtroStatus, periodo, page]);

  useEffect(() => {
    fetchConsultas();
  }, [fetchConsultas]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filtroStatus, periodo]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const startIndex = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(page * ITEMS_PER_PAGE, total);

  const toggleStatus = (value: string) => {
    setFiltroStatus((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por médico ou queixa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full bg-secondary border-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodoFilter value={periodo ?? { from: new Date(0), to: new Date(), label: "Todo período" }} onChange={setPeriodo} />
          <Popover open={showFiltroStatus} onOpenChange={setShowFiltroStatus}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-full">
                <Filter className="h-4 w-4" />
                Status
                {filtroStatus.length > 0 && (
                  <Badge className="rounded-full h-5 min-w-5 px-1.5 bg-primary text-white hover:bg-primary">
                    {filtroStatus.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 space-y-2">
              {STATUS_CONSULTA_OPCOES.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filtroStatus.includes(opt.value)}
                    onCheckedChange={() => toggleStatus(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      ) : consultas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || filtroStatus.length || periodo ? "Nenhuma consulta encontrada para o filtro." : "Nenhuma consulta registrada."}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-table-head hover:bg-table-head border-none">
                <TableHead>Data</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Queixa</TableHead>
                <TableHead>Retorno</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultas.map((c) => {
                const badge = getConsultaStatusBadge(c.status);
                return (
                  <TableRow
                    key={c.id}
                    className="bg-card border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelecionada(c)}
                  >
                    <TableCell className="text-sm">{formatDateTime(c.data_consulta)}</TableCell>
                    <TableCell className="font-medium">{c.medico_nome || "—"}</TableCell>
                    <TableCell className="text-sm">{c.queixa_principal || "—"}</TableCell>
                    <TableCell>
                      {c.eh_retorno && (
                        <Badge className="border-none rounded-full bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple">
                          Retorno
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="border-none rounded-full" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-center gap-4 py-6">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-normal">
              {startIndex} a {endIndex} de {total}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <ConsultaDetalheSheet consulta={selecionada} onOpenChange={(open) => !open && setSelecionada(null)} />
    </div>
  );
}
