import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
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

interface Produto {
  id: string;
  nome_comercial: string;
  imagem_url: string | null;
  status: string;
  indicacoes?: string[];
}


const Produtos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [status, setStatus] = useState<'todos'|'ativo'|'inativo'>('todos');
  const [nome, setNome] = useState("");
  const [indicacoes, setIndicacoes] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Buscar produtos do banco de dados
  const fetchProdutos = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('produtos')
        .select('id, nome_comercial, imagem_url, status', { count: 'exact' });

      // Aplicar filtros
      if (status !== 'todos') {
        query = query.eq('status', status);
      }
      
      if (nome) {
        query = query.ilike('nome_comercial', `%${nome}%`);
      }

      if (searchQuery) {
        query = query.ilike('nome_comercial', `%${searchQuery}%`);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Buscar indicações clínicas para cada produto
      const produtosComIndicacoes = await Promise.all(
        (data || []).map(async (produto) => {
          const { data: indicacoesData } = await supabase
            .from('produto_indicacoes')
            .select(`
              indicacoes_clinicas (nome)
            `)
            .eq('produto_id', produto.id);

          return {
            ...produto,
            indicacoes: indicacoesData?.map(i => (i as any).indicacoes_clinicas?.nome).filter(Boolean) || []
          };
        })
      );

      setProdutos(produtosComIndicacoes);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [currentPage, searchQuery]);

  // Subscrição realtime para atualização automática
  useRealtimeSubscription({
    table: 'produtos',
    onInsert: () => fetchProdutos(),
    onUpdate: () => fetchProdutos(),
    onDelete: () => fetchProdutos(),
  });

  // Aplicar filtros
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchProdutos();
    setShowFilterDialog(false);
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setNome('');
    setIndicacoes('');
    setStatus('todos');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);


  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Catálogo de produtos</h1>

        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar produto..."
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
              className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-[20px]"
              onClick={() => navigate("/produtos/novo")}
            >
              <Plus className="h-4 w-4" />
              Cadastrar produto
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Produtos</h2>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-card-green border-none hover:bg-card-green">
                <TableHead className="font-semibold text-foreground">Imagem</TableHead>
                <TableHead className="font-semibold text-foreground">Nome comercial</TableHead>
                <TableHead className="font-semibold text-foreground">Indicações clínicas</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando produtos...
                  </TableCell>
                </TableRow>
              ) : produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((produto) => (
                  <TableRow
                    key={produto.id}
                    className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                    onClick={() => navigate(`/produtos/${produto.id}`)}
                  >
                    <TableCell>
                      {produto.imagem_url ? (
                        <img 
                          src={produto.imagem_url} 
                          alt={produto.nome_comercial}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                          <div className="w-6 h-8 bg-purple-500 rounded-sm relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-2 bg-purple-600 rounded-t"></div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{produto.nome_comercial}</TableCell>
                    <TableCell className="font-normal">
                      {produto.indicacoes && produto.indicacoes.length > 0 
                        ? produto.indicacoes.join(', ') 
                        : 'Sem indicações cadastradas'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          produto.status === "ativo"
                            ? "rounded-full px-4 py-1 font-medium border-none bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                            : "rounded-full px-4 py-1 font-medium border-none bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {produto.status === "ativo" ? "Ativo" : "Inativo"}
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
      </div>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Nome</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Óleo canabidiol" className="h-11" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Indicações</label>
                <Input value={indicacoes} onChange={(e) => setIndicacoes(e.target.value)} placeholder="Ex.: Ansiedade" className="h-11" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">Status</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="prd-status" checked={status==='todos'} onChange={() => setStatus('todos')} /> Todos
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="prd-status" checked={status==='ativo'} onChange={() => setStatus('ativo')} /> Ativo
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="prd-status" checked={status==='inativo'} onChange={() => setStatus('inativo')} /> Inativo
                </label>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <Button className="w-full h-12 bg-green-600 text-white hover:bg-green-700 rounded-[10px]" onClick={handleApplyFilters}>Aplicar filtros</Button>
              <Button variant="link" className="w-full text-green-600 hover:text-green-700" onClick={handleClearFilters}>Limpar filtros</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
