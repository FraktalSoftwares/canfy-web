import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStatusBadge, FILTRO_STATUS_GRUPOS, StatusPedido } from "@/lib/pedidoStatus";

interface PedidoRow {
  id: string;
  numero_pedido: string;
  paciente_nome: string;
  prescritor_nome: string | null;
  data_pedido: string;
  valor_total: number | null;
  status: string;
  total_count: number;
}

const ITEMS_PER_PAGE = 100;

const formatCurrency = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

const Pedidos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); // 1-based

  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  // filtros aplicados
  const [filtroGrupos, setFiltroGrupos] = useState<string[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroPeriodoCustom, setFiltroPeriodoCustom] = useState("");
  const [filtroMedico, setFiltroMedico] = useState("");
  const [filtroPaciente, setFiltroPaciente] = useState("");

  // rascunho dentro do modal (só commita ao "Aplicar filtros")
  const [draftGrupos, setDraftGrupos] = useState<string[]>([]);
  const [draftPeriodo, setDraftPeriodo] = useState("");
  const [draftPeriodoCustom, setDraftPeriodoCustom] = useState("");
  const [draftMedico, setDraftMedico] = useState("");
  const [draftPaciente, setDraftPaciente] = useState("");

  const periodoToDataIni = (periodo: string, custom: string): string | null => {
    const now = new Date();
    if (periodo === "7dias") return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (periodo === "30dias") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (periodo === "3meses") return new Date(now.getTime() - 90 * 86400000).toISOString();
    if (periodo === "outro" && custom) {
      const d = new Date(custom);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  };

  const statusesFromGrupos = (grupos: string[]): StatusPedido[] =>
    FILTRO_STATUS_GRUPOS.filter((g) => grupos.includes(g.key)).flatMap((g) => g.statuses);

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const statuses = statusesFromGrupos(filtroGrupos);
      const dataIni = periodoToDataIni(filtroPeriodo, filtroPeriodoCustom);
      const { data, error } = await supabase.rpc("admin_list_pedidos", {
        p_search: searchQuery.trim() || null,
        p_status: statuses.length ? statuses : null,
        p_data_ini: dataIni,
        p_data_fim: null,
        p_medico: filtroMedico.trim() || null,
        p_paciente: filtroPaciente.trim() || null,
        p_limit: ITEMS_PER_PAGE,
        p_offset: (page - 1) * ITEMS_PER_PAGE,
      });
      if (error) throw error;
      const rows = (data || []) as PedidoRow[];
      setPedidos(rows);
      setTotal(rows.length > 0 ? Number(rows[0].total_count) : 0);
    } catch (e: any) {
      console.error("Erro ao carregar pedidos:", e);
      toast({
        title: "Erro ao carregar pedidos",
        description: e.message ?? "Não foi possível carregar a lista de pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filtroGrupos, filtroPeriodo, filtroPeriodoCustom, filtroMedico, filtroPaciente, page]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // Busca: ao alterar o termo, volta para a primeira página
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useRealtimeSubscription({
    table: "pedidos",
    onInsert: () => fetchPedidos(),
    onUpdate: () => fetchPedidos(),
    onDelete: () => fetchPedidos(),
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const startIndex = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(page * ITEMS_PER_PAGE, total);

  const openFilterModal = () => {
    setDraftGrupos(filtroGrupos);
    setDraftPeriodo(filtroPeriodo);
    setDraftPeriodoCustom(filtroPeriodoCustom);
    setDraftMedico(filtroMedico);
    setDraftPaciente(filtroPaciente);
    setShowFilterModal(true);
  };

  const toggleDraftGrupo = (key: string) => {
    setDraftGrupos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const aplicarFiltros = () => {
    setFiltroGrupos(draftGrupos);
    setFiltroPeriodo(draftPeriodo);
    setFiltroPeriodoCustom(draftPeriodoCustom);
    setFiltroMedico(draftMedico);
    setFiltroPaciente(draftPaciente);
    setPage(1);
    setShowFilterModal(false);
  };

  const limparFiltros = () => {
    setDraftGrupos([]);
    setDraftPeriodo("");
    setDraftPeriodoCustom("");
    setDraftMedico("");
    setDraftPaciente("");
    setFiltroGrupos([]);
    setFiltroPeriodo("");
    setFiltroPeriodoCustom("");
    setFiltroMedico("");
    setFiltroPaciente("");
    setPage(1);
    setShowFilterModal(false);
  };

  const downloadCSV = (filename: string, headers: string[], rows: (string | number | null)[][]) => {
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

  const openPDFPrint = (title: string, headers: string[], rows: (string | number | null)[][]) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const thead = headers.map((h) => `<th>${h}</th>`).join("");
    const tbody = rows
      .map((r) => "<tr>" + r.map((c) => `<td>${c == null ? "" : String(c)}</td>`).join("") + "</tr>")
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}h1{font-size:18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
th{background:#eef}</style></head><body><h1>${title}</h1><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
    w.document.close();
  };

  const handleExport = () => {
    const headers = ["ID", "Paciente", "Prescritor", "Data do pedido", "Valor", "Status"];
    const rows = pedidos.map((p) => [
      `#${p.numero_pedido}`,
      p.paciente_nome,
      p.prescritor_nome || "—",
      formatDate(p.data_pedido),
      formatCurrency(p.valor_total),
      getStatusBadge(p.status).label,
    ]);
    const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
    if (exportFormat === "csv") {
      downloadCSV(`pedidos_${stamp}.csv`, headers, rows);
    } else {
      openPDFPrint(`Pedidos — ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, headers, rows);
    }
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8">
        {/* Busca e ações */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar pedido..."
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
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Pedidos</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head border-none hover:bg-table-head">
                    <TableHead className="font-semibold text-foreground">ID</TableHead>
                    <TableHead className="font-semibold text-foreground">Paciente</TableHead>
                    <TableHead className="font-semibold text-foreground">Prescritor</TableHead>
                    <TableHead className="font-semibold text-foreground">Data do pedido</TableHead>
                    <TableHead className="font-semibold text-foreground">Valor</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((pedido) => {
                    const badge = getStatusBadge(pedido.status);
                    return (
                      <TableRow
                        key={pedido.id}
                        className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                        onClick={() => navigate(`/pedidos/${pedido.id}`)}
                      >
                        <TableCell className="font-semibold">#{pedido.numero_pedido}</TableCell>
                        <TableCell className="font-normal">{pedido.paciente_nome}</TableCell>
                        <TableCell className="font-normal">{pedido.prescritor_nome || "—"}</TableCell>
                        <TableCell className="font-normal">{formatDate(pedido.data_pedido)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(pedido.valor_total)}</TableCell>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: badge.bg, color: badge.fg }}
                            className="border-none rounded-full px-4 py-1 font-medium"
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Paginação (server-side) */}
              <div className="flex items-center justify-center gap-4 py-6">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
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
                <span className="text-sm text-muted-foreground font-normal">
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

        {/* Modal Exportar */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="sm:max-w-[400px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Exportar</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowExportModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "pdf")} className="space-y-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">Exportar em PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">Exportar em CSV</Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowExportModal(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleExport}>
                Exportar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Filtros */}
        <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
          <DialogContent className="sm:max-w-[470px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Filtros</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFilterModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status do pedido */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Status do pedido</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FILTRO_STATUS_GRUPOS.map((g) => (
                    <div key={g.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${g.key}`}
                        checked={draftGrupos.includes(g.key)}
                        onCheckedChange={() => toggleDraftGrupo(g.key)}
                      />
                      <Label htmlFor={`status-${g.key}`} className="font-normal cursor-pointer">{g.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Período */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Período</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { key: "7dias", label: "Últimos 7 dias" },
                    { key: "30dias", label: "Últimos 30 dias" },
                    { key: "3meses", label: "Últimos 3 meses" },
                    { key: "outro", label: "Outro" },
                  ].map((opt) => (
                    <Button
                      key={opt.key}
                      variant={draftPeriodo === opt.key ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full ${
                        draftPeriodo === opt.key
                          ? "bg-primary text-white hover:bg-primary-dark"
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setDraftPeriodo(opt.key)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {draftPeriodo === "outro" && (
                  <Input
                    type="date"
                    value={draftPeriodoCustom}
                    onChange={(e) => setDraftPeriodoCustom(e.target.value)}
                    placeholder="Insira um período"
                    className="h-9 text-sm"
                  />
                )}
              </div>

              {/* Médico prescritor */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Médico prescritor</h3>
                <Input
                  value={draftMedico}
                  onChange={(e) => setDraftMedico(e.target.value)}
                  placeholder="Digite o nome ou CRM do médico"
                  className="h-10 text-sm"
                />
              </div>

              {/* Paciente */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Paciente</h3>
                <Input
                  value={draftPaciente}
                  onChange={(e) => setDraftPaciente(e.target.value)}
                  placeholder="Digite o nome ou CPF do paciente"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button className="w-full bg-primary text-white hover:bg-primary-dark rounded-full" onClick={aplicarFiltros}>
                Aplicar filtros
              </Button>
              <Button variant="link" className="w-full text-primary hover:text-primary-dark" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Pedidos;
