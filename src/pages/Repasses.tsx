import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSituacaoBadge,
  getOrigemLabel,
  SITUACOES_ORDENADAS,
  SITUACAO_OPCOES,
  ORIGEM_REPASSE_OPCOES,
  SituacaoRepasse,
} from "@/lib/repasseSituacao";
import { formatCurrency } from "@/lib/utils";
import { getUserFriendlyError } from "@/lib/errorUtils";
import { usePermissions } from "@/hooks/usePermissions";

const ITEMS_PER_PAGE = 100;

interface RepasseRow {
  id: string;
  medico_id: string;
  medico_nome: string;
  origem: string;
  referencia: string | null;
  data_repasse: string;
  base_calculo: number | null;
  percentual: number | null;
  valor: number;
  status: string;
  situacao: string;
  asaas_status: string | null;
  pago_em: string | null;
  erro: string | null;
  total_count: number;
}

interface TotalSituacao {
  situacao: string;
  quantidade: number;
  valor_total: number;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

/**
 * Repasses aos médicos.
 *
 * A pergunta que esta tela existe para responder é "o que já foi pago e o que
 * ainda precisa sair" — por isso os KPIs no topo são por SITUAÇÃO, não por
 * status. O status gravado tem só três valores e junta "o paciente nem pagou"
 * com "o dinheiro está aqui parado", que são coisas operacionalmente opostas.
 *
 * A lista abre ordenada pelo que exige ação (pendência, depois a transferir),
 * não pelo histórico.
 */
const Repasses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { podeEditar } = usePermissions();
  const podeReprocessar = podeEditar("usuarios");

  const [repasses, setRepasses] = useState<RepasseRow[]>([]);
  const [totais, setTotais] = useState<TotalSituacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroDataIni, setFiltroDataIni] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const [draftSituacao, setDraftSituacao] = useState("");
  const [draftOrigem, setDraftOrigem] = useState("");
  const [draftDataIni, setDraftDataIni] = useState("");
  const [draftDataFim, setDraftDataFim] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchRepasses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_list_repasses", {
        p_search: searchQuery.trim() || null,
        p_situacao: filtroSituacao || null,
        p_origem: filtroOrigem || null,
        p_medico: null,
        p_data_ini: filtroDataIni || null,
        p_data_fim: filtroDataFim || null,
        p_limit: ITEMS_PER_PAGE,
        p_offset: (page - 1) * ITEMS_PER_PAGE,
      });
      if (error) throw error;
      const rows = (data ?? []) as RepasseRow[];
      setRepasses(rows);
      setTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (e) {
      toast({
        title: "Erro ao carregar repasses",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filtroSituacao, filtroOrigem, filtroDataIni, filtroDataFim, page, toast]);

  const fetchTotais = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("admin_repasses_totais", {
        p_data_ini: filtroDataIni || null,
        p_data_fim: filtroDataFim || null,
        p_medico: null,
        p_origem: filtroOrigem || null,
      });
      if (error) throw error;
      setTotais((data ?? []) as TotalSituacao[]);
    } catch (e) {
      toast({
        title: "Erro ao calcular totais",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    }
  }, [filtroDataIni, filtroDataFim, filtroOrigem, toast]);

  useEffect(() => {
    fetchRepasses();
  }, [fetchRepasses]);

  useEffect(() => {
    fetchTotais();
  }, [fetchTotais]);

  // Busca: ao alterar o termo, volta para a primeira página
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useRealtimeSubscription({
    table: "repasses_medicos",
    onInsert: () => {
      fetchRepasses();
      fetchTotais();
    },
    onUpdate: () => {
      fetchRepasses();
      fetchTotais();
    },
    onDelete: () => {
      fetchRepasses();
      fetchTotais();
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const startIndex = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(page * ITEMS_PER_PAGE, total);

  const totalDe = (situacao: SituacaoRepasse) =>
    totais.find((t) => t.situacao === situacao) ?? {
      situacao,
      quantidade: 0,
      valor_total: 0,
    };

  const openFilterModal = () => {
    setDraftSituacao(filtroSituacao);
    setDraftOrigem(filtroOrigem);
    setDraftDataIni(filtroDataIni);
    setDraftDataFim(filtroDataFim);
    setShowFilterModal(true);
  };

  const aplicarFiltros = () => {
    setFiltroSituacao(draftSituacao);
    setFiltroOrigem(draftOrigem);
    setFiltroDataIni(draftDataIni);
    setFiltroDataFim(draftDataFim);
    setPage(1);
    setShowFilterModal(false);
  };

  const limparFiltros = () => {
    setDraftSituacao("");
    setDraftOrigem("");
    setDraftDataIni("");
    setDraftDataFim("");
    setFiltroSituacao("");
    setFiltroOrigem("");
    setFiltroDataIni("");
    setFiltroDataFim("");
    setPage(1);
    setShowFilterModal(false);
  };

  /** Clicar num KPI filtra a lista por aquela situação — e clicar de novo limpa. */
  const alternarFiltroSituacao = (situacao: SituacaoRepasse) => {
    setFiltroSituacao((atual) => (atual === situacao ? "" : situacao));
    setPage(1);
  };

  const reprocessar = async (id: string) => {
    try {
      setReprocessando(id);
      const { error } = await supabase.rpc("admin_repasse_reprocessar", { p_id: id });
      if (error) throw error;
      toast({
        title: "Repasse reenviado",
        description: "A transferência foi disparada; acompanhe a situação nesta tela.",
      });
      fetchRepasses();
      fetchTotais();
    } catch (e) {
      toast({
        title: "Não foi possível reprocessar",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    } finally {
      setReprocessando(null);
    }
  };

  const downloadCSV = (
    filename: string,
    headers: string[],
    rows: (string | number | null)[][],
  ) => {
    const escape = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const headers = [
      "Médico",
      "Origem",
      "Referência",
      "Data",
      "Base",
      "%",
      "Valor",
      "Situação",
      "Pago em",
      "Pendência",
    ];
    const rows = repasses.map((r) => [
      r.medico_nome,
      getOrigemLabel(r.origem),
      r.referencia ?? "—",
      formatDate(r.data_repasse),
      r.base_calculo != null ? formatCurrency(r.base_calculo) : "—",
      r.percentual != null ? `${r.percentual}%` : "—",
      formatCurrency(r.valor),
      getSituacaoBadge(r.situacao).label,
      formatDate(r.pago_em),
      r.erro ?? "",
    ]);
    const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
    downloadCSV(`repasses_${stamp}.csv`, headers, rows);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8">
        {/* Totais por situação: a leitura de "já pago" vs. "ainda precisa sair" */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {SITUACOES_ORDENADAS.map((situacao) => {
            const badge = getSituacaoBadge(situacao);
            const t = totalDe(situacao);
            const ativo = filtroSituacao === situacao;
            return (
              <button
                key={situacao}
                type="button"
                onClick={() => alternarFiltroSituacao(situacao)}
                title={badge.ajuda}
                className={`text-left rounded-[10px] px-4 py-3 transition-opacity hover:opacity-90 ${
                  ativo ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: badge.bg, color: badge.fg }}
              >
                <p className="text-xs font-medium">{badge.label}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(t.valor_total)}</p>
                <p className="text-xs opacity-80">
                  {t.quantidade} {t.quantidade === 1 ? "repasse" : "repasses"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Busca e ações */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar por médico ou pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary rounded-[20px] text-primary placeholder:text-primary/60"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={openFilterModal}
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Repasses</h2>
            {filtroSituacao && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => setFiltroSituacao("")}
              >
                <X className="h-3 w-3" />
                {getSituacaoBadge(filtroSituacao).label}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
          ) : repasses.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum repasse encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head border-none hover:bg-table-head">
                    <TableHead className="font-semibold text-foreground">Médico</TableHead>
                    <TableHead className="font-semibold text-foreground">Origem</TableHead>
                    <TableHead className="font-semibold text-foreground">Referência</TableHead>
                    <TableHead className="font-semibold text-foreground">Data</TableHead>
                    <TableHead className="font-semibold text-foreground">Base</TableHead>
                    <TableHead className="font-semibold text-foreground">%</TableHead>
                    <TableHead className="font-semibold text-foreground">Valor</TableHead>
                    <TableHead className="font-semibold text-foreground">Situação</TableHead>
                    <TableHead className="font-semibold text-foreground">Pago em</TableHead>
                    <TableHead className="font-semibold text-foreground">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repasses.map((r) => {
                    const badge = getSituacaoBadge(r.situacao);
                    return (
                      <TableRow
                        key={r.id}
                        className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                        onClick={() => navigate(`/medicos/${r.medico_id}`)}
                      >
                        <TableCell className="font-semibold">{r.medico_nome}</TableCell>
                        <TableCell className="font-normal">{getOrigemLabel(r.origem)}</TableCell>
                        <TableCell className="font-normal">{r.referencia ?? "—"}</TableCell>
                        <TableCell className="font-normal">{formatDate(r.data_repasse)}</TableCell>
                        <TableCell className="font-normal">
                          {r.base_calculo != null ? formatCurrency(r.base_calculo) : "—"}
                        </TableCell>
                        <TableCell className="font-normal">
                          {r.percentual != null ? `${r.percentual}%` : "—"}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(r.valor)}</TableCell>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: badge.bg, color: badge.fg }}
                            className="border-none rounded-full px-4 py-1 font-medium"
                          >
                            {badge.label}
                          </Badge>
                          {r.erro && (
                            <p className="text-xs text-destructive mt-1 max-w-[260px]">{r.erro}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-normal">{formatDate(r.pago_em)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {r.situacao === "pendencia" && podeReprocessar ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 rounded-full"
                              disabled={reprocessando === r.id}
                              onClick={() => reprocessar(r.id)}
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${reprocessando === r.id ? "animate-spin" : ""}`}
                              />
                              Reprocessar
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Paginação (server-side) */}
              <div className="flex items-center justify-center gap-4 py-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {startIndex} a {endIndex} de {total}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Filtrar repasses</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Situação</p>
              <div className="flex flex-wrap gap-2">
                {SITUACAO_OPCOES.map((op) => (
                  <Button
                    key={op.value}
                    variant={draftSituacao === op.value ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      setDraftSituacao((atual) => (atual === op.value ? "" : op.value))
                    }
                  >
                    {op.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Origem</p>
              <div className="flex flex-wrap gap-2">
                {ORIGEM_REPASSE_OPCOES.map((op) => (
                  <Button
                    key={op.value}
                    variant={draftOrigem === op.value ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      setDraftOrigem((atual) => (atual === op.value ? "" : op.value))
                    }
                  >
                    {op.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">De</p>
                <Input
                  type="date"
                  value={draftDataIni}
                  onChange={(e) => setDraftDataIni(e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Até</p>
                <Input
                  type="date"
                  value={draftDataFim}
                  onChange={(e) => setDraftDataFim(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" className="rounded-full" onClick={limparFiltros}>
              Limpar
            </Button>
            <Button className="rounded-full" onClick={aplicarFiltros}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repasses;
