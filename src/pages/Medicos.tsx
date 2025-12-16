import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Medico {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  crm: string;
  uf_crm: string;
  especialidade_nome: string;
  status: string;
  total_atendimentos: number;
  ultimo_acesso: string;
}

const Medicos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Filter states
  const [status, setStatus] = useState("todos");
  const [crm, setCrm] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  // Buscar médicos do banco
  const fetchMedicos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_list_medicos');

      if (error) throw error;

      // Filtros client-side
      let filteredData = data || [];
      
      if (searchQuery) {
        filteredData = filteredData.filter((m: Medico) =>
          m.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (status !== "todos") {
        filteredData = filteredData.filter((m: Medico) => m.status === status);
      }

      if (crm) {
        filteredData = filteredData.filter((m: Medico) =>
          m.crm.toLowerCase().includes(crm.toLowerCase()) ||
          m.uf_crm.toLowerCase().includes(crm.toLowerCase())
        );
      }

      if (especialidade) {
        filteredData = filteredData.filter((m: Medico) =>
          m.especialidade_nome.toLowerCase().includes(especialidade.toLowerCase())
        );
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedData = filteredData.slice(from, to);

      setMedicos(paginatedData);
      setTotalCount(filteredData.length);
    } catch (error: any) {
      console.error('Erro ao buscar médicos:', error);
      toast({
        title: "Erro ao carregar médicos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
  }, [currentPage, searchQuery, status, crm, especialidade, toast]);

  // Subscrição realtime para atualização automática
  useRealtimeSubscription({
    table: 'medicos',
    onInsert: () => fetchMedicos(),
    onUpdate: () => fetchMedicos(),
    onDelete: () => fetchMedicos(),
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "N/A";
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    setStatus("todos");
    setCrm("");
    setEspecialidade("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8">
        <Tabs defaultValue="medicos" className="w-full">
          <TabsList className="mb-6 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="medicos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 pb-3"
            >
              Médicos
            </TabsTrigger>
            <TabsTrigger 
              value="solicitacoes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 pb-3"
            >
              Solicitações de novos médicos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medicos" className="mt-0">
            {/* Search and Actions */}
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

            {/* Table */}
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
                    <TableHead className="font-semibold text-foreground">Último acesso</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Carregando médicos...
                      </TableCell>
                    </TableRow>
                  ) : medicos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Nenhum médico encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    medicos.map((medico, index) => (
                      <TableRow 
                        key={medico.id}
                        className={`hover:bg-muted/50 cursor-pointer ${index % 2 === 0 ? 'bg-card' : 'bg-card-green/30'}`}
                        onClick={() => navigate(`/medicos/${medico.id}`)}
                      >
                        <TableCell className="font-semibold">{medico.nome}</TableCell>
                        <TableCell className="font-normal">{medico.email}</TableCell>
                        <TableCell className="font-normal">{medico.telefone || "N/A"}</TableCell>
                        <TableCell className="font-normal">{medico.crm}-{medico.uf_crm}</TableCell>
                        <TableCell className="font-normal">{medico.especialidade_nome}</TableCell>
                        <TableCell className="font-normal">{medico.total_atendimentos}</TableCell>
                        <TableCell className="font-normal text-sm">{formatDate(medico.ultimo_acesso)}</TableCell>
                        <TableCell>
                          <Badge 
                            className={`rounded-full px-4 py-1 font-medium ${
                              medico.status === "ativo" 
                                ? "bg-blue-100 text-blue-600 hover:bg-blue-100" 
                                : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {medico.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground font-normal">
                  {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} from {totalCount}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
            </div>
          </TabsContent>

          <TabsContent value="solicitacoes">
            <div className="text-center py-20 text-muted-foreground">
              <p>Solicitações de novos médicos em breve...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Filtros</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowFilterDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Status */}
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

            {/* CRM e Especialidade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">CRM</label>
                <Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Ex.: 12345-SP" className="h-11" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Especialidade</label>
                <Input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder="Ex.: Clínico geral" className="h-11" />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button className="w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-[10px]" onClick={handleApplyFilters}>
                Aplicar filtros
              </Button>
              <Button variant="link" className="w-full text-green-600 hover:text-green-700" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Exportar dados</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowExportDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <p className="text-sm text-muted-foreground">Os dados visíveis na tabela serão exportados como CSV.</p>
            <Button className="w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-[10px]" onClick={() => setShowExportDialog(false)}>Exportar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Medicos;