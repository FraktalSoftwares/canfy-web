import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ValidacaoStatus = "em_analise" | "incompleto" | "aprovado" | "recusado";

interface Medico {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  crm: string;
  uf_crm: string;
  especialidade_nome: string;
  status: string;
  total_atendimentos: number;
  total_ausencias: number;
  ultimo_acesso: string;
}

interface MedicoSolicitacao {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  crm: string;
  uf_crm: string;
  especialidade_nome: string;
  total_atendimentos: number;
  ultimo_acesso: string | null;
  foto_perfil_url: string | null;
  status_validacao: ValidacaoStatus;
  etapa_validacao: number;
  created_at: string;
}

const ATENDIMENTOS_RANGES = ["0-5", "6-10", "11-20", "+20"] as const;
const AUSENCIAS_RANGES = ["0", "1-5", "6-10", "+10"] as const;
type Range = typeof ATENDIMENTOS_RANGES[number] | typeof AUSENCIAS_RANGES[number];

const matchRange = (value: number, range: string) => {
  if (range === "0") return value === 0;
  if (range.startsWith("+")) return value > parseInt(range.slice(1), 10);
  const [min, max] = range.split("-").map((n) => parseInt(n, 10));
  return value >= min && value <= max;
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

const VALIDACAO_TAG: Record<ValidacaoStatus, { letter: string; label: string; bg: string; fg: string }> = {
  em_analise: { letter: "E", label: "Em análise",  bg: "hsl(var(--card-blue))",   fg: "hsl(207 89% 35%)" },
  incompleto: { letter: "I", label: "Incompleto",  bg: "hsl(var(--card-yellow))", fg: "hsl(45 100% 35%)" },
  aprovado:   { letter: "A", label: "Aprovado",    bg: "hsl(var(--card-green))",  fg: "hsl(var(--primary-dark))" },
  recusado:   { letter: "R", label: "Recusado",    bg: "hsl(var(--card-red))",    fg: "hsl(var(--destructive))" },
};

const itemsPerPage = 10;

const Medicos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // ATIVOS
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicosTotal, setMedicosTotal] = useState(0);
  const [medicosPage, setMedicosPage] = useState(1);

  // SOLICITAÇÕES
  const [solicitacoes, setSolicitacoes] = useState<MedicoSolicitacao[]>([]);
  const [solicitacoesTotal, setSolicitacoesTotal] = useState(0);
  const [solicitacoesPage, setSolicitacoesPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  const [status, setStatus] = useState("todos");
  const [crm, setCrm] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [filtroAtendimentos, setFiltroAtendimentos] = useState<string>("");
  const [filtroAusencias, setFiltroAusencias] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  // Overlay aprovação/recusa solicitação
  const [selectedSolic, setSelectedSolic] = useState<MedicoSolicitacao | null>(null);
  const [recusaMotivo, setRecusaMotivo] = useState("");
  const [showRecusaPanel, setShowRecusaPanel] = useState(false);
  const [acting, setActing] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [a, b] = await Promise.all([
        (supabase.rpc as any)("admin_list_medicos"),
        (supabase.rpc as any)("admin_list_medicos_solicitacoes"),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;

      let ativos: Medico[] = (a.data || []).filter((m: Medico) => m.status !== "pendente_aprovacao");

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        ativos = ativos.filter((m) => m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
      }
      if (status !== "todos") ativos = ativos.filter((m) => m.status === status);
      if (crm) ativos = ativos.filter((m) => m.crm.toLowerCase().includes(crm.toLowerCase()) || m.uf_crm.toLowerCase().includes(crm.toLowerCase()));
      if (especialidade) ativos = ativos.filter((m) => m.especialidade_nome.toLowerCase().includes(especialidade.toLowerCase()));
      if (filtroAtendimentos) ativos = ativos.filter((m) => matchRange(m.total_atendimentos ?? 0, filtroAtendimentos));
      if (filtroAusencias) ativos = ativos.filter((m) => matchRange(m.total_ausencias ?? 0, filtroAusencias));

      setMedicosTotal(ativos.length);
      const aFrom = (medicosPage - 1) * itemsPerPage;
      setMedicos(ativos.slice(aFrom, aFrom + itemsPerPage));

      let solics: MedicoSolicitacao[] = b.data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        solics = solics.filter((m) => m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
      }
      setSolicitacoesTotal(solics.length);
      const sFrom = (solicitacoesPage - 1) * itemsPerPage;
      setSolicitacoes(solics.slice(sFrom, sFrom + itemsPerPage));
    } catch (e: any) {
      toast({ title: "Erro ao carregar médicos", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicosPage, solicitacoesPage, searchQuery, status, crm, especialidade, filtroAtendimentos, filtroAusencias]);

  useRealtimeSubscription({
    table: "medicos",
    onInsert: () => fetchAll(),
    onUpdate: () => fetchAll(),
    onDelete: () => fetchAll(),
  });

  const medicosTotalPages = useMemo(() => Math.ceil(medicosTotal / itemsPerPage), [medicosTotal]);
  const solicitacoesTotalPages = useMemo(() => Math.ceil(solicitacoesTotal / itemsPerPage), [solicitacoesTotal]);

  const formatDate = (d: string | null) => {
    if (!d) return "Nunca";
    try {
      return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const getInitials = (n: string) =>
    n.split(" ").map((s) => s[0]).join("").substring(0, 2).toUpperCase();

  const handleAprovar = async () => {
    if (!selectedSolic) return;
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_aprovar_medico", { p_id: selectedSolic.id });
      if (error) throw error;
      toast({ title: "Médico aprovado" });
      setSelectedSolic(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("admin_list_medicos");
      if (error) throw error;
      let lista: Medico[] = ((data || []) as Medico[]).filter((m) => m.status !== "pendente_aprovacao");
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        lista = lista.filter((m) => m.nome.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
      }
      if (status !== "todos") lista = lista.filter((m) => m.status === status);
      if (crm) lista = lista.filter((m) => m.crm.toLowerCase().includes(crm.toLowerCase()) || m.uf_crm.toLowerCase().includes(crm.toLowerCase()));
      if (especialidade) lista = lista.filter((m) => m.especialidade_nome.toLowerCase().includes(especialidade.toLowerCase()));
      if (filtroAtendimentos) lista = lista.filter((m) => matchRange(m.total_atendimentos ?? 0, filtroAtendimentos));
      if (filtroAusencias) lista = lista.filter((m) => matchRange(m.total_ausencias ?? 0, filtroAusencias));

      const headers = ["Nome", "E-mail", "Telefone", "CPF", "CRM+UF", "Especialidade", "Atendimentos", "Ausências", "Último acesso", "Status"];
      const rows = lista.map((m) => [
        m.nome,
        m.email,
        m.telefone || "",
        m.cpf || "",
        `${m.crm}-${m.uf_crm}`,
        m.especialidade_nome,
        m.total_atendimentos,
        m.total_ausencias,
        formatDate(m.ultimo_acesso),
        m.status === "ativo" ? "Ativo" : "Inativo",
      ]);
      const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
      if (exportFormat === "csv") {
        downloadCSV(`medicos_${stamp}.csv`, headers, rows);
      } else {
        openPDFPrint(`Médicos — ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, headers, rows);
      }
      setShowExportDialog(false);
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    }
  };

  const handleRecusar = async () => {
    if (!selectedSolic || !recusaMotivo.trim()) {
      toast({ title: "Informe o motivo da recusa", variant: "destructive" });
      return;
    }
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_recusar_medico", {
        p_id: selectedSolic.id,
        p_motivo: recusaMotivo.trim(),
      });
      if (error) throw error;
      toast({ title: "Solicitação recusada" });
      setSelectedSolic(null);
      setShowRecusaPanel(false);
      setRecusaMotivo("");
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao recusar", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8">
        <Tabs defaultValue="medicos" className="w-full">
          <TabsList className="mb-6 bg-transparent border-b border-border rounded-none w-full h-auto p-0 grid grid-cols-2">
            <TabsTrigger
              value="medicos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold pb-3"
            >
              Médicos
            </TabsTrigger>
            <TabsTrigger
              value="solicitacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold pb-3"
            >
              Solicitações de novos médicos
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center justify-between mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                placeholder="Buscar médico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-primary rounded-[20px] text-primary placeholder:text-primary/60"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
                onClick={() => setShowFilterDialog(true)}
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>

          <TabsContent value="medicos" className="mt-0">
            <div className="bg-secondary rounded-[10px] overflow-hidden">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">Médicos</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-card-green border-none hover:bg-card-green">
                    <TableHead className="font-semibold text-foreground">Nome</TableHead>
                    <TableHead className="font-semibold text-foreground">E-mail</TableHead>
                    <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                    <TableHead className="font-semibold text-foreground">CRM+UF</TableHead>
                    <TableHead className="font-semibold text-foreground">Especialidade</TableHead>
                    <TableHead className="font-semibold text-foreground">Atendimentos</TableHead>
                    <TableHead className="font-semibold text-foreground">Ausências</TableHead>
                    <TableHead className="font-semibold text-foreground">Último acesso</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Carregando médicos...</TableCell>
                    </TableRow>
                  ) : medicos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Nenhum médico encontrado</TableCell>
                    </TableRow>
                  ) : (
                    medicos.map((m) => (
                      <TableRow
                        key={m.id}
                        className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                        onClick={() => navigate(`/medicos/${m.id}`)}
                      >
                        <TableCell className="font-semibold">{m.nome}</TableCell>
                        <TableCell>{m.email}</TableCell>
                        <TableCell>{m.telefone || "—"}</TableCell>
                        <TableCell>{m.crm}-{m.uf_crm}</TableCell>
                        <TableCell>{m.especialidade_nome}</TableCell>
                        <TableCell>{m.total_atendimentos}</TableCell>
                        <TableCell className={m.total_ausencias > 15 ? "text-destructive font-semibold" : ""}>
                          {m.total_ausencias}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(m.ultimo_acesso)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              m.status === "ativo"
                                ? "rounded-full px-4 py-1 font-medium border-none bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                                : "rounded-full px-4 py-1 font-medium border-none bg-muted text-muted-foreground hover:bg-muted"
                            }
                          >
                            {m.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Pagination
                page={medicosPage}
                totalPages={medicosTotalPages}
                total={medicosTotal}
                onPage={setMedicosPage}
              />
            </div>
          </TabsContent>

          <TabsContent value="solicitacoes" className="mt-0">
            <div className="bg-secondary rounded-[10px] overflow-hidden">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">Solicitações de novos médicos</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-card-green border-none hover:bg-card-green">
                    <TableHead className="font-semibold text-foreground">Nome</TableHead>
                    <TableHead className="font-semibold text-foreground">E-mail</TableHead>
                    <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                    <TableHead className="font-semibold text-foreground">CPF</TableHead>
                    <TableHead className="font-semibold text-foreground">CRM+UF</TableHead>
                    <TableHead className="font-semibold text-foreground">Especialidade</TableHead>
                    <TableHead className="font-semibold text-foreground">Etapa</TableHead>
                    <TableHead className="font-semibold text-foreground">Recebido em</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Carregando solicitações...</TableCell>
                    </TableRow>
                  ) : solicitacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Nenhuma solicitação pendente</TableCell>
                    </TableRow>
                  ) : (
                    solicitacoes.map((s) => {
                      const tag = VALIDACAO_TAG[s.status_validacao] ?? VALIDACAO_TAG.em_analise;
                      return (
                        <TableRow
                          key={s.id}
                          className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                          onClick={() => setSelectedSolic(s)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={s.foto_perfil_url ?? undefined} />
                                <AvatarFallback className="bg-card-orange text-foreground text-xs font-semibold">
                                  {getInitials(s.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold">{s.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.telefone || "—"}</TableCell>
                          <TableCell>{s.cpf || "—"}</TableCell>
                          <TableCell>{s.crm}-{s.uf_crm}</TableCell>
                          <TableCell>{s.especialidade_nome}</TableCell>
                          <TableCell>{s.etapa_validacao}/3</TableCell>
                          <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
                          <TableCell>
                            <Badge
                              style={{ backgroundColor: tag.bg, color: tag.fg }}
                              className="border-none rounded-full h-7 w-7 p-0 flex items-center justify-center font-bold"
                              title={tag.label}
                            >
                              {tag.letter}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <Pagination
                page={solicitacoesPage}
                totalPages={solicitacoesTotalPages}
                total={solicitacoesTotal}
                onPage={setSolicitacoesPage}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Overlay aprovar / recusar solicitação */}
      <Dialog
        open={!!selectedSolic}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSolic(null);
            setShowRecusaPanel(false);
            setRecusaMotivo("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Solicitação de cadastro</DialogTitle>
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setSelectedSolic(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedSolic && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedSolic.foto_perfil_url ?? undefined} />
                  <AvatarFallback className="bg-card-orange text-foreground text-lg font-semibold">
                    {getInitials(selectedSolic.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{selectedSolic.nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedSolic.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Info label="CRM" value={`${selectedSolic.crm}-${selectedSolic.uf_crm}`} />
                <Info label="Especialidade" value={selectedSolic.especialidade_nome} />
                <Info label="Telefone" value={selectedSolic.telefone || "—"} />
                <Info label="Etapa de validação" value={`${selectedSolic.etapa_validacao} de 3`} />
              </div>

              {!showRecusaPanel ? (
                <div className="flex gap-3 pt-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setShowRecusaPanel(true)}
                    disabled={acting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Recusar
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full"
                    onClick={handleAprovar}
                    disabled={acting}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar cadastro
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  <div>
                    <Label className="text-sm font-semibold">Motivo da recusa</Label>
                    <Textarea
                      value={recusaMotivo}
                      onChange={(e) => setRecusaMotivo(e.target.value)}
                      placeholder="Explique o motivo para o médico..."
                      className="min-h-[100px] mt-1 bg-background border-border resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => { setShowRecusaPanel(false); setRecusaMotivo(""); }}
                      disabled={acting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full"
                      onClick={handleRecusar}
                      disabled={acting}
                    >
                      Confirmar recusa
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Filtros</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFilterDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div>
              <label className="text-sm font-semibold mb-3 block">Status</label>
              <RadioGroup value={status} onValueChange={setStatus}>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="todos" id="md-todos" />
                  <Label htmlFor="md-todos" className="cursor-pointer font-normal">Todos</Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="ativo" id="md-ativo" />
                  <Label htmlFor="md-ativo" className="cursor-pointer font-normal">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inativo" id="md-inativo" />
                  <Label htmlFor="md-inativo" className="cursor-pointer font-normal">Inativo</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block">CRM+UF</label>
              <Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="ex.: 12345-SP" className="h-11" />
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block">Especialidade</label>
              <Input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder="ex.: Clínico geral" className="h-11" />
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block">Nº de atendimentos</label>
              <div className="flex gap-2">
                {ATENDIMENTOS_RANGES.map((r) => (
                  <Button
                    key={r}
                    variant={filtroAtendimentos === r ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full flex-1 ${filtroAtendimentos === r ? "bg-primary text-white hover:bg-primary-dark" : "border-border hover:bg-muted"}`}
                    onClick={() => setFiltroAtendimentos(filtroAtendimentos === r ? "" : r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-3 block">Nº de ausências em consultas (ano)</label>
              <div className="flex gap-2">
                {AUSENCIAS_RANGES.map((r) => (
                  <Button
                    key={r}
                    variant={filtroAusencias === r ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full flex-1 ${filtroAusencias === r ? "bg-primary text-white hover:bg-primary-dark" : "border-border hover:bg-muted"}`}
                    onClick={() => setFiltroAusencias(filtroAusencias === r ? "" : r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => { setMedicosPage(1); setShowFilterDialog(false); }}
                className="w-full h-12 bg-primary text-white hover:bg-primary-dark rounded-[10px]"
              >
                Aplicar filtros
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  setStatus("todos"); setCrm(""); setEspecialidade("");
                  setFiltroAtendimentos(""); setFiltroAusencias("");
                  setMedicosPage(1);
                }}
                className="w-full text-primary hover:text-primary-dark"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[400px] p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Exportar</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowExportDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "pdf")} className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="exp-csv" />
              <Label htmlFor="exp-csv" className="font-normal cursor-pointer">Exportar em CSV</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="exp-pdf" />
              <Label htmlFor="exp-pdf" className="font-normal cursor-pointer">Exportar em PDF</Label>
            </div>
          </RadioGroup>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleExport}>
              Exportar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Pagination({
  page, totalPages, total, onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const to = Math.min(page * itemsPerPage, total);
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPage(1)} disabled={page === 1}>
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">{from} a {to} de {total}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPage(totalPages)} disabled={page >= totalPages}>
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default Medicos;
