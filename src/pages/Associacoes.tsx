import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { MASK_MAX_LENGTH, maskCNPJ, maskTelefone } from "@/lib/masks";
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

interface Associacao {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  regiao: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  status: string;
  observacoes: string | null;
}

const Associacoes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [associacoes, setAssociacoes] = useState<Associacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Filter states
  const [tipo, setTipo] = useState("todas");
  const [cidade, setCidade] = useState("");
  const [regiao, setRegiao] = useState("");
  const [status, setStatus] = useState("ativo");

  // Create form states
  const [newAssociacao, setNewAssociacao] = useState({
    nome: "",
    tipo: "associacao",
    cnpj: "",
    email: "",
    telefone: "",
    regiao: "",
    observacoes: "",
  });

  // Produtos que fornece + Outras informações (documentos exigidos)
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<{ id: string; nome_comercial: string }[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [requerDocumentos, setRequerDocumentos] = useState(false);
  const [documentosExigidos, setDocumentosExigidos] = useState<string[]>([]);

  useEffect(() => {
    const fetchProdutos = async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id, nome_comercial")
        .order("nome_comercial");
      setProdutosDisponiveis(data ?? []);
    };
    fetchProdutos();
  }, []);

  const resetProdutosEDocumentos = () => {
    setBuscaProduto("");
    setProdutosSelecionados([]);
    setRequerDocumentos(false);
    setDocumentosExigidos([]);
  };

  const toggleProdutoSelecionado = (produtoId: string) => {
    setProdutosSelecionados((prev) =>
      prev.includes(produtoId) ? prev.filter((id) => id !== produtoId) : [...prev, produtoId]
    );
  };

  const produtosFiltrados = produtosDisponiveis.filter((p) =>
    p.nome_comercial.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  // Buscar associações do banco
  const fetchAssociacoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_list_associacoes');

      if (error) throw error;

      // Filtros client-side
      let filteredData = data || [];
      
      if (searchQuery) {
        filteredData = filteredData.filter((a: Associacao) =>
          a.nome.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (tipo !== "todas") {
        filteredData = filteredData.filter((a: Associacao) => a.tipo === tipo);
      }

      if (cidade) {
        filteredData = filteredData.filter((a: Associacao) => 
          a.cidade?.toLowerCase().includes(cidade.toLowerCase())
        );
      }

      if (regiao) {
        filteredData = filteredData.filter((a: Associacao) => 
          a.regiao?.toLowerCase().includes(regiao.toLowerCase())
        );
      }

      if (status) {
        filteredData = filteredData.filter((a: Associacao) => a.status === status);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedData = filteredData.slice(from, to);

      setAssociacoes(paginatedData);
      setTotalCount(filteredData.length);
    } catch (error: any) {
      console.error('Erro ao buscar associações:', error);
      toast({
        title: "Erro ao carregar associações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Busca/filtros: ao alterar, volta para a primeira página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tipo, cidade, regiao, status]);

  useEffect(() => {
    fetchAssociacoes();
  }, [currentPage, searchQuery, tipo, cidade, regiao, status, toast]);

  // Subscrição realtime para atualização automática
  useRealtimeSubscription({
    table: 'associacoes_marcas',
    onInsert: () => fetchAssociacoes(),
    onUpdate: () => fetchAssociacoes(),
    onDelete: () => fetchAssociacoes(),
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    setTipo("todas");
    setCidade("");
    setRegiao("");
    setStatus("ativo");
    setCurrentPage(1);
  };

  const handleCreateAssociacao = async () => {
    try {
      const { data: id, error } = await (supabase.rpc as any)('admin_create_associacao', {
        p_nome: newAssociacao.nome,
        p_tipo: newAssociacao.tipo,
        p_cnpj: newAssociacao.cnpj || null,
        p_email: newAssociacao.email || null,
        p_telefone: newAssociacao.telefone || null,
        p_regiao: newAssociacao.regiao || null,
        p_observacoes: newAssociacao.observacoes || null,
        p_produtos_ids: produtosSelecionados.length > 0 ? produtosSelecionados : null,
        p_documentos_obrigatorios: requerDocumentos
          ? documentosExigidos.filter((d) => d.trim())
          : null,
      });

      if (error) throw error;

      setShowCreateDialog(false);
      toast({
        title: "Associação/marca cadastrada com sucesso!",
        className: "bg-card-green border-primary/20",
      });

      // Reset form e recarregar lista
      setNewAssociacao({
        nome: "",
        tipo: "associacao",
        cnpj: "",
        email: "",
        telefone: "",
        regiao: "",
        observacoes: "",
      });
      resetProdutosEDocumentos();

      // Recarregar dados
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Erro ao criar associação:', error);
      toast({
        title: "Erro ao cadastrar associação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setNewAssociacao({
      nome: "",
      tipo: "associacao",
      cnpj: "",
      email: "",
      telefone: "",
      regiao: "",
      observacoes: "",
    });
    resetProdutosEDocumentos();
  };

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Associações e marcas</h1>

        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar associação/marca..."
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
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Cadastrar associação/marca
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Associações e marcas</h2>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-table-head border-none hover:bg-table-head">
                <TableHead className="font-semibold text-foreground">Nome</TableHead>
                <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                <TableHead className="font-semibold text-foreground">Região</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando associações...
                  </TableCell>
                </TableRow>
              ) : associacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Nenhuma associação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                associacoes.map((associacao, index) => (
                  <TableRow
                    key={associacao.id}
                    className="hover:bg-muted/40 cursor-pointer bg-card border-b border-border/40"
                    onClick={() => navigate(`/associacoes/${associacao.id}`)}
                  >
                    <TableCell className="font-semibold">{associacao.nome}</TableCell>
                    <TableCell className="font-normal capitalize">{associacao.tipo}</TableCell>
                    <TableCell className="font-normal">
                      {associacao.endereco || associacao.regiao || "N/A"}
                      {associacao.cidade && `, ${associacao.cidade}`}
                      {associacao.estado && `/${associacao.estado}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          associacao.status === "ativo"
                            ? "rounded-full px-4 py-1 font-medium border-none bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                            : "rounded-full px-4 py-1 font-medium border-none bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {associacao.status === "ativo" ? "Ativo" : "Inativo"}
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
        <DialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
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
            {/* Tipo */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Tipo</label>
              <RadioGroup value={tipo} onValueChange={setTipo}>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="todas" id="todas" />
                  <Label htmlFor="todas" className="cursor-pointer font-normal">
                    Todas
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="associacao" id="associacao" />
                  <Label htmlFor="associacao" className="cursor-pointer font-normal">
                    Associação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marca" id="marca" />
                  <Label htmlFor="marca" className="cursor-pointer font-normal">
                    Marca
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Cidade e Região */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Cidade</label>
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder='Ex: "São Paulo"'
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Região</label>
                <Input
                  value={regiao}
                  onChange={(e) => setRegiao(e.target.value)}
                  placeholder='Ex: "SP"'
                  className="h-11"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Status</label>
              <RadioGroup value={status} onValueChange={setStatus}>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="ativo" id="ativo" />
                  <Label htmlFor="ativo" className="cursor-pointer font-normal">
                    Ativo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inativo" id="inativo" />
                  <Label htmlFor="inativo" className="cursor-pointer font-normal">
                    Inativo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleApplyFilters}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover rounded-[10px]"
              >
                Aplicar filtros
              </Button>
              <Button
                variant="link"
                onClick={handleClearFilters}
                className="w-full text-primary hover:text-primary-dark"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px] p-6 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between mb-2">
              <div>
                <DialogTitle className="text-xl font-semibold mb-1">
                  Cadastrar nova associação/marca
                </DialogTitle>
                <p className="text-sm text-muted-foreground font-normal">
                  Preencha as informações abaixo para cadastrar uma nova associação/marca.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancelCreate}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-5 mt-6">
            {/* Nome */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Nome</label>
              <Input
                value={newAssociacao.nome}
                onChange={(e) => setNewAssociacao({...newAssociacao, nome: e.target.value})}
                placeholder="Ex.: Associação Canábica Brasil"
                className="h-11"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Tipo</label>
              <RadioGroup 
                value={newAssociacao.tipo} 
                onValueChange={(value) => setNewAssociacao({...newAssociacao, tipo: value})}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="associacao" id="new-associacao" />
                  <Label htmlFor="new-associacao" className="cursor-pointer font-normal">
                    Associação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marca" id="new-marca" />
                  <Label htmlFor="new-marca" className="cursor-pointer font-normal">
                    Marca
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* CNPJ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">CNPJ</label>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <Input
                value={newAssociacao.cnpj}
                onChange={(e) => setNewAssociacao({...newAssociacao, cnpj: maskCNPJ(e.target.value)})}
                placeholder="Ex: 12.345.678/0001-90"
                maxLength={MASK_MAX_LENGTH.cnpj}
                inputMode="numeric"
                className="h-11"
              />
            </div>

            {/* E-mail institucional */}
            <div>
              <label className="text-sm font-semibold mb-2 block">E-mail institucional</label>
              <Input
                value={newAssociacao.email}
                onChange={(e) => setNewAssociacao({...newAssociacao, email: e.target.value})}
                placeholder="Ex.: contato@associacao.com.br"
                className="h-11"
                type="email"
              />
            </div>

            {/* Telefone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Telefone</label>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <Input
                value={newAssociacao.telefone}
                onChange={(e) => setNewAssociacao({...newAssociacao, telefone: maskTelefone(e.target.value)})}
                placeholder="Ex: (11) 98765-4321"
                maxLength={MASK_MAX_LENGTH.telefone}
                inputMode="numeric"
                className="h-11"
              />
            </div>

            {/* Região */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Região</label>
              <Input
                value={newAssociacao.regiao}
                onChange={(e) => setNewAssociacao({...newAssociacao, regiao: e.target.value})}
                placeholder="Ex.: São Paulo/SP - Vila Mariana"
                className="h-11"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Observações</label>
              <Textarea
                value={newAssociacao.observacoes}
                onChange={(e) => setNewAssociacao({...newAssociacao, observacoes: e.target.value})}
                placeholder="Ex.: Atendimento prioritário para novos médicos"
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Produtos que fornece */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Produtos que fornece</label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-9 h-10 rounded-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto rounded-[10px] bg-secondary p-4">
                {produtosFiltrados.length === 0 ? (
                  <p className="col-span-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                ) : (
                  produtosFiltrados.map((produto) => (
                    <div key={produto.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`produto-${produto.id}`}
                        checked={produtosSelecionados.includes(produto.id)}
                        onCheckedChange={() => toggleProdutoSelecionado(produto.id)}
                      />
                      <label
                        htmlFor={`produto-${produto.id}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {produto.nome_comercial}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Outras informações */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Outras informações</label>
              <p className="text-sm text-muted-foreground mb-3">
                A associação/marca exige outros documentos além da receita médica?
              </p>
              <RadioGroup
                value={requerDocumentos ? "sim" : "nao"}
                onValueChange={(v) => setRequerDocumentos(v === "sim")}
                className="flex gap-6 mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="requer-docs-sim" />
                  <Label htmlFor="requer-docs-sim" className="cursor-pointer font-normal">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="requer-docs-nao" />
                  <Label htmlFor="requer-docs-nao" className="cursor-pointer font-normal">Não</Label>
                </div>
              </RadioGroup>

              {requerDocumentos && (
                <div className="space-y-3">
                  {documentosExigidos.map((doc, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold">Documento exigido {index + 1}</label>
                        <button
                          type="button"
                          onClick={() =>
                            setDocumentosExigidos((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="text-destructive hover:opacity-80"
                          aria-label="Remover documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Input
                        value={doc}
                        onChange={(e) =>
                          setDocumentosExigidos((prev) =>
                            prev.map((d, i) => (i === index ? e.target.value : d))
                          )
                        }
                        placeholder="Ex.: Laudo médico"
                        className="h-11"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setDocumentosExigidos((prev) => [...prev, ""])}
                    className="gap-2 text-primary hover:text-primary-dark p-0 h-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Mais documentos
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelCreate}
                className="flex-1 h-11 rounded-[10px] border-border"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateAssociacao}
                className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary-hover rounded-[10px]"
                disabled={!newAssociacao.nome || !newAssociacao.email}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Associacoes;