import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Receita {
  id: string;
  numero_receita: string;
  data_emissao: string;
  validade: string;
  status: string;
  paciente: {
    user_id: string;
    profiles: {
      nome_completo: string;
    };
  };
  medico: {
    nome: string;
  };
  pedidos: {
    numero_pedido: string;
    data_pedido: string;
    valor_total: number;
    canal_aquisicao: string;
  }[];
}


const Receitas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Filter states
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const [customPeriodo, setCustomPeriodo] = useState("");
  
  const [statusPedido, setStatusPedido] = useState({
    aprovado: false,
    emAnalise: false,
    recusado: false,
    cancelado: false,
    entregue: false,
  });

  const [canaisAquisicao, setCanaisAquisicao] = useState<string[]>([]);
  const [customCanal, setCustomCanal] = useState("");
  
  const [medicoPrescritor, setMedicoPrescritor] = useState("");
  const [paciente, setPaciente] = useState("");

  const periodos = ["Últimos 7 dias", "Últimos 30 dias", "Últimos 3 meses", "Outro"];
  const canaisDisponiveis = ["ACAMP", "AlmaLab", "Bluebird", "CBD Living", "HempLucid", "Nui", "Outro"];

  // Export modal state
  const [exportFormat, setExportFormat] = useState<'CSV' | 'XLSX' | 'PDF'>('CSV');
  const [exportScope, setExportScope] = useState<'tabela' | 'todas'>('tabela');

  // Buscar receitas do banco
  const fetchReceitas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_list_receitas');

      if (error) throw error;

      // Transformar dados para o formato esperado
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        numero_receita: item.numero_receita,
        data_emissao: item.data_emissao,
        validade: item.validade,
        status: item.status,
        paciente: {
          user_id: item.paciente_user_id,
          profiles: {
            nome_completo: item.paciente_nome
          }
        },
        medico: {
          nome: item.medico_nome
        },
        pedidos: item.pedidos || []
      }));

      // Aplicar filtro de busca
      let filteredData = transformedData;
      if (searchQuery) {
        filteredData = transformedData.filter((r: any) => 
          r.numero_receita.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Aplicar paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedData = filteredData.slice(from, to);

      setReceitas(paginatedData);
      setTotalCount(filteredData.length);
    } catch (error: any) {
      console.error('Erro ao buscar receitas:', error);
      toast({
        title: "Erro ao carregar receitas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceitas();
  }, [currentPage, searchQuery, toast]);

  // Subscrição realtime para atualização automática
  useRealtimeSubscription({
    table: 'receitas',
    onInsert: () => fetchReceitas(),
    onUpdate: () => fetchReceitas(),
    onDelete: () => fetchReceitas(),
  });

  useRealtimeSubscription({
    table: 'pedidos',
    onInsert: () => fetchReceitas(),
    onUpdate: () => fetchReceitas(),
    onDelete: () => fetchReceitas(),
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      ativa: { label: "A", color: "bg-green-500" },
      utilizada: { label: "U", color: "bg-blue-500" },
      expirada: { label: "E", color: "bg-red-500" },
      cancelada: { label: "C", color: "bg-gray-500" },
    };
    
    const statusInfo = statusMap[status] || { label: "-", color: "bg-gray-400" };
    
    return (
      <Badge className={`rounded-full w-8 h-8 flex items-center justify-center ${statusInfo.color} text-white hover:${statusInfo.color} font-semibold`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleApplyFilters = () => {
    // Apply filter logic here
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    setSelectedPeriodo("");
    setCustomPeriodo("");
    setStatusPedido({
      aprovado: false,
      emAnalise: false,
      recusado: false,
      cancelado: false,
      entregue: false,
    });
    setCanaisAquisicao([]);
    setCustomCanal("");
    setMedicoPrescritor("");
    setPaciente("");
  };

  const toggleCanalAquisicao = (canal: string) => {
    setCanaisAquisicao(prev =>
      prev.includes(canal)
        ? prev.filter(c => c !== canal)
        : [...prev, canal]
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8">
        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar receita ou pedido..."
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
            <h2 className="text-lg font-semibold text-foreground">Receitas e pedidos</h2>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-card-green border-none hover:bg-card-green">
                <TableHead className="font-semibold text-foreground">ID da receita</TableHead>
                <TableHead className="font-semibold text-foreground">Paciente</TableHead>
                <TableHead className="font-semibold text-foreground">Prescritor</TableHead>
                <TableHead className="font-semibold text-foreground">Nº pedido</TableHead>
                <TableHead className="font-semibold text-foreground">Data pedido</TableHead>
                <TableHead className="font-semibold text-foreground">Valor</TableHead>
                <TableHead className="font-semibold text-foreground">Aquisição</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando receitas...
                  </TableCell>
                </TableRow>
              ) : receitas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Nenhuma receita encontrada
                  </TableCell>
                </TableRow>
              ) : (
                receitas.map((receita, index) => {
                  const pedido = receita.pedidos && receita.pedidos.length > 0 ? receita.pedidos[0] : null;
                  
                  return (
                    <TableRow 
                      key={receita.id}
                      className={`hover:bg-muted/50 cursor-pointer ${index % 2 === 0 ? 'bg-card' : 'bg-card-green/30'}`}
                      onClick={() => navigate(`/receitas/${receita.id}`)}
                    >
                      <TableCell className="font-normal">{receita.numero_receita}</TableCell>
                      <TableCell className="font-semibold">
                        {(receita.paciente as any)?.profiles?.nome_completo || "N/A"}
                      </TableCell>
                      <TableCell className="font-normal">
                        {(receita.medico as any)?.nome || "N/A"}
                      </TableCell>
                      <TableCell className="font-normal">
                        {pedido?.numero_pedido || "Não se aplica"}
                      </TableCell>
                      <TableCell className="font-normal">
                        {pedido ? formatDate(pedido.data_pedido) : "Não se aplica"}
                      </TableCell>
                      <TableCell className="font-normal">
                        {pedido ? formatCurrency(pedido.valor_total || 0) : "Não se aplica"}
                      </TableCell>
                      <TableCell className="font-normal">
                        {pedido?.canal_aquisicao || "Não se aplica"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(receita.status)}
                      </TableCell>
                    </TableRow>
                  );
                })
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
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[580px] p-6 max-h-[90vh] overflow-y-auto [&>button]:hidden">
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
            {/* Período */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Período</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {periodos.map((periodo) => (
                  <Badge
                    key={periodo}
                    onClick={() => setSelectedPeriodo(periodo)}
                    className={`cursor-pointer px-4 py-2 rounded-full ${
                      selectedPeriodo === periodo
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-white text-foreground border border-border hover:bg-gray-50'
                    }`}
                  >
                    {periodo}
                  </Badge>
                ))}
              </div>
              {selectedPeriodo === "Outro" && (
                <Input
                  value={customPeriodo}
                  onChange={(e) => setCustomPeriodo(e.target.value)}
                  placeholder="Insira um período"
                  className="h-11"
                />
              )}
            </div>

            {/* Status do pedido */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Status do pedido</label>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aprovado"
                    checked={statusPedido.aprovado}
                    onCheckedChange={(checked) =>
                      setStatusPedido({ ...statusPedido, aprovado: checked as boolean })
                    }
                  />
                  <label htmlFor="aprovado" className="text-sm cursor-pointer">
                    Aprovado
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emAnalise"
                    checked={statusPedido.emAnalise}
                    onCheckedChange={(checked) =>
                      setStatusPedido({ ...statusPedido, emAnalise: checked as boolean })
                    }
                  />
                  <label htmlFor="emAnalise" className="text-sm cursor-pointer">
                    Em análise
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recusado"
                    checked={statusPedido.recusado}
                    onCheckedChange={(checked) =>
                      setStatusPedido({ ...statusPedido, recusado: checked as boolean })
                    }
                  />
                  <label htmlFor="recusado" className="text-sm cursor-pointer">
                    Recusado
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cancelado"
                    checked={statusPedido.cancelado}
                    onCheckedChange={(checked) =>
                      setStatusPedido({ ...statusPedido, cancelado: checked as boolean })
                    }
                  />
                  <label htmlFor="cancelado" className="text-sm cursor-pointer">
                    Cancelado
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entregue"
                    checked={statusPedido.entregue}
                    onCheckedChange={(checked) =>
                      setStatusPedido({ ...statusPedido, entregue: checked as boolean })
                    }
                  />
                  <label htmlFor="entregue" className="text-sm cursor-pointer">
                    Entregue
                  </label>
                </div>
              </div>
            </div>

            {/* Canal de aquisição */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Canal de aquisição</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {canaisDisponiveis.map((canal) => (
                  <Badge
                    key={canal}
                    onClick={() => toggleCanalAquisicao(canal)}
                    className={`cursor-pointer px-4 py-2 rounded-full ${
                      canaisAquisicao.includes(canal)
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-white text-foreground border border-border hover:bg-gray-50'
                    }`}
                  >
                    {canal}
                  </Badge>
                ))}
              </div>
              {canaisAquisicao.includes("Outro") && (
                <Input
                  value={customCanal}
                  onChange={(e) => setCustomCanal(e.target.value)}
                  placeholder="Insira outra forma de uso"
                  className="h-11"
                />
              )}
            </div>

            {/* Médico prescritor */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Médico prescritor</label>
              <Input
                value={medicoPrescritor}
                onChange={(e) => setMedicoPrescritor(e.target.value)}
                placeholder="Digite o nome ou CRM do médico"
                className="h-11"
              />
            </div>

            {/* Paciente */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Paciente</label>
              <Input
                value={paciente}
                onChange={(e) => setPaciente(e.target.value)}
                placeholder="Digite o nome ou CPF do paciente"
                className="h-11"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleApplyFilters}
                className="w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-[10px]"
              >
                Aplicar filtros
              </Button>
              <Button
                variant="link"
                onClick={handleClearFilters}
                className="w-full text-green-600 hover:text-green-700"
              >
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
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowExportDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div>
              <label className="text-sm font-semibold mb-3 block">Formato</label>
              <div className="flex gap-2">
                {(["CSV","XLSX","PDF"] as const).map((f) => (
                  <Badge
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={`cursor-pointer px-4 py-2 rounded-full ${
                      exportFormat === f
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-white text-foreground border border-border hover:bg-gray-50'
                    }`}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">Escopo</label>
              <div className="flex gap-2">
                {([
                  { key: 'tabela', label: 'Tabela atual' },
                  { key: 'todas', label: 'Todas as receitas' },
                ] as const).map((opt) => (
                  <Badge
                    key={opt.key}
                    onClick={() => setExportScope(opt.key)}
                    className={`cursor-pointer px-4 py-2 rounded-full ${
                      exportScope === opt.key
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-white text-foreground border border-border hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              className="w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-[10px]"
              onClick={() => setShowExportDialog(false)}
            >
              Exportar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receitas;
