import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Paciente {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  endereco_completo: string;
  total_consultas: number;
  total_pedidos: number;
  ultimo_acesso: string;
  created_at: string;
  ativo: boolean;
}

const Pacientes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterConsultas, setFilterConsultas] = useState("");
  const [filterPedidos, setFilterPedidos] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPacientes();
  }, []);

  // Busca: ao alterar o termo, volta para a primeira página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Subscrição realtime para atualização automática
  useRealtimeSubscription({
    table: 'pacientes',
    onInsert: () => fetchPacientes(),
    onUpdate: () => fetchPacientes(),
    onDelete: () => fetchPacientes(),
  });

  useRealtimeSubscription({
    table: 'profiles',
    onUpdate: () => fetchPacientes(),
  });

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_list_pacientes');
      
      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Error fetching pacientes:', error);
      toast({
        title: "Erro ao carregar pacientes",
        description: "Não foi possível carregar a lista de pacientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const matchRange = (value: number, range: string) => {
    if (!range) return true;
    if (range === "0-5") return value >= 0 && value <= 5;
    if (range === "6-10") return value >= 6 && value <= 10;
    if (range === "11-20") return value >= 11 && value <= 20;
    if (range === "+20") return value > 20;
    return true;
  };

  const matchPeriod = (createdAt: string) => {
    if (!filterPeriod) return true;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const dayMs = 86400000;
    if (filterPeriod === "7dias") return now - created <= 7 * dayMs;
    if (filterPeriod === "30dias") return now - created <= 30 * dayMs;
    if (filterPeriod === "3meses") return now - created <= 90 * dayMs;
    return true;
  };

  const filteredPacientes = pacientes.filter((paciente) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || paciente.nome_completo.toLowerCase().includes(q)
      || paciente.email.toLowerCase().includes(q)
      || paciente.cpf.includes(searchQuery);

    const matchesStatus = !filterStatus
      || (filterStatus === "ativo" && paciente.ativo)
      || (filterStatus === "inativo" && !paciente.ativo);

    return matchesSearch
      && matchesStatus
      && matchRange(paciente.total_consultas, filterConsultas)
      && matchRange(paciente.total_pedidos, filterPedidos)
      && matchPeriod(paciente.created_at);
  });

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
    const headers = ["Nome", "E-mail", "Telefone", "CPF", "Consultas", "Pedidos", "Último acesso", "Status"];
    const rows = filteredPacientes.map((p) => [
      p.nome_completo,
      p.email,
      p.telefone || "",
      p.cpf,
      p.total_consultas,
      p.total_pedidos,
      formatDate(p.ultimo_acesso),
      p.ativo ? "Ativo" : "Inativo",
    ]);
    const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
    if (exportFormat === "csv") {
      downloadCSV(`pacientes_${stamp}.csv`, headers, rows);
    } else {
      openPDFPrint(`Pacientes — ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, headers, rows);
    }
    setShowExportModal(false);
  };

  const limparFiltros = () => {
    setFilterPeriod("");
    setFilterStatus("");
    setFilterConsultas("");
    setFilterPedidos("");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredPacientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPacientes = filteredPacientes.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy • HH:mm");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary rounded-[20px] text-primary placeholder:text-primary/60"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={() => setShowFilterModal(true)}
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

        {/* Table */}
        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Pacientes</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
          ) : currentPacientes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum paciente encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head border-none hover:bg-table-head">
                    <TableHead className="font-semibold text-foreground">Nome</TableHead>
                    <TableHead className="font-semibold text-foreground">E-mail</TableHead>
                    <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                    <TableHead className="font-semibold text-foreground">CPF</TableHead>
                    <TableHead className="font-semibold text-foreground">Consultas</TableHead>
                    <TableHead className="font-semibold text-foreground">Pedidos</TableHead>
                    <TableHead className="font-semibold text-foreground">Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPacientes.map((paciente) => (
                    <TableRow
                      key={paciente.id}
                      className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                      onClick={() => navigate(`/pacientes/${paciente.id}`)}
                    >
                      <TableCell className="font-semibold">{paciente.nome_completo}</TableCell>
                      <TableCell className="font-normal">{paciente.email}</TableCell>
                      <TableCell className="font-normal">{paciente.telefone || "N/A"}</TableCell>
                      <TableCell className="font-normal">{paciente.cpf}</TableCell>
                      <TableCell className="font-normal">{paciente.total_consultas}</TableCell>
                      <TableCell className="font-normal">{paciente.total_pedidos}</TableCell>
                      <TableCell className="text-muted-foreground font-normal">{formatDate(paciente.ultimo_acesso)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 py-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground font-normal">
                  {filteredPacientes.length === 0 ? 0 : startIndex + 1} a {Math.min(endIndex, filteredPacientes.length)} de {filteredPacientes.length}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Export Modal */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="sm:max-w-[400px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Exportar</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowExportModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "pdf")} className="space-y-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">Exportar em CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">Exportar em PDF</Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full"
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filter Modal */}
        <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
          <DialogContent className="sm:max-w-[470px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Filtros</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowFilterModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Período de cadastro */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Período de cadastro</h3>
                <div className="flex gap-2 mb-2">
                  <Button
                    variant={filterPeriod === "7dias" ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      filterPeriod === "7dias" 
                        ? "bg-primary text-white hover:bg-primary-dark" 
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setFilterPeriod("7dias")}
                  >
                    Últimos 7 dias
                  </Button>
                  <Button
                    variant={filterPeriod === "30dias" ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      filterPeriod === "30dias" 
                        ? "bg-primary text-white hover:bg-primary-dark" 
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setFilterPeriod("30dias")}
                  >
                    Últimos 30 dias
                  </Button>
                  <Button
                    variant={filterPeriod === "3meses" ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      filterPeriod === "3meses" 
                        ? "bg-primary text-white hover:bg-primary-dark" 
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setFilterPeriod("3meses")}
                  >
                    Últimos 3 meses
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant={filterPeriod === "outro" ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      filterPeriod === "outro" 
                        ? "bg-primary text-white hover:bg-primary-dark" 
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setFilterPeriod("outro")}
                  >
                    Outro
                  </Button>
                  {filterPeriod === "outro" && (
                    <Input
                      placeholder="Insira um período"
                      className="flex-1 h-9 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Status</h3>
                <RadioGroup value={filterStatus} onValueChange={setFilterStatus} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ativo" id="ativo" />
                    <Label htmlFor="ativo" className="font-normal cursor-pointer">Ativo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inativo" id="inativo" />
                    <Label htmlFor="inativo" className="font-normal cursor-pointer">Inativo</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Nº de consultas realizadas */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Nº de consultas realizadas</h3>
                <div className="flex gap-2">
                  {["0-5", "6-10", "11-20", "+20"].map((range) => (
                    <Button
                      key={range}
                      variant={filterConsultas === range ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full flex-1 ${
                        filterConsultas === range 
                          ? "bg-primary text-white hover:bg-primary-dark" 
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setFilterConsultas(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Nº de pedidos realizados */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Nº de pedidos realizados</h3>
                <div className="flex gap-2">
                  {["0-5", "6-10", "11-20", "+20"].map((range) => (
                    <Button
                      key={range}
                      variant={filterPedidos === range ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full flex-1 ${
                        filterPedidos === range 
                          ? "bg-primary text-white hover:bg-primary-dark" 
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => setFilterPedidos(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full bg-primary text-white hover:bg-primary-dark rounded-full"
                onClick={() => {
                  setCurrentPage(1);
                  setShowFilterModal(false);
                }}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="link"
                className="w-full text-primary hover:text-primary-dark"
                onClick={limparFiltros}
              >
                Limpar filtros
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Pacientes;
