import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  const [exportFormat, setExportFormat] = useState("pdf");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterConsultas, setFilterConsultas] = useState("");
  const [filterPedidos, setFilterPedidos] = useState("0-5");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPacientes();
  }, []);

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

  const filteredPacientes = pacientes.filter((paciente) => {
    const matchesSearch = paciente.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         paciente.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         paciente.cpf.includes(searchQuery);
    
    const matchesStatus = !filterStatus || 
                         (filterStatus === "ativo" && paciente.ativo) ||
                         (filterStatus === "inativo" && !paciente.ativo);

    let matchesConsultas = true;
    if (filterConsultas) {
      const consultas = paciente.total_consultas;
      if (filterConsultas === "0-5") matchesConsultas = consultas >= 0 && consultas <= 5;
      else if (filterConsultas === "6-10") matchesConsultas = consultas >= 6 && consultas <= 10;
      else if (filterConsultas === "11-20") matchesConsultas = consultas >= 11 && consultas <= 20;
      else if (filterConsultas === "+20") matchesConsultas = consultas > 20;
    }

    let matchesPedidos = true;
    if (filterPedidos) {
      const pedidos = paciente.total_pedidos;
      if (filterPedidos === "0-5") matchesPedidos = pedidos >= 0 && pedidos <= 5;
      else if (filterPedidos === "6-10") matchesPedidos = pedidos >= 6 && pedidos <= 10;
      else if (filterPedidos === "11-20") matchesPedidos = pedidos >= 11 && pedidos <= 20;
      else if (filterPedidos === "+20") matchesPedidos = pedidos > 20;
    }

    return matchesSearch && matchesStatus && matchesConsultas && matchesPedidos;
  });

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
                  <TableRow className="bg-card-green border-none hover:bg-card-green">
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
                  {startIndex + 1} to {Math.min(endIndex, filteredPacientes.length)} from {filteredPacientes.length}
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
            
            <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="space-y-4">
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
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full"
                onClick={() => {
                  // Handle export logic here
                  setShowExportModal(false);
                }}
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
                  // Handle apply filters logic here
                  setShowFilterModal(false);
                }}
              >
                Aplicar filtros
              </Button>
              <Button
                variant="link"
                className="w-full text-primary hover:text-primary-dark"
                onClick={() => {
                  setFilterPeriod("");
                  setFilterStatus("");
                  setFilterConsultas("");
                  setFilterPedidos("0-5");
                }}
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
