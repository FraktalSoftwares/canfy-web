import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Pencil, Copy, AlertCircle, Trash2, Check, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Produto {
  id: string;
  nome_comercial: string;
  principio_ativo: string;
  forma_farmaceutica: string;
  concentracao_cbd: string | null;
  concentracao_thc: string | null;
  fabricante: string | null;
  volume_quantidade: string | null;
  imagem_url: string | null;
  status: string;
  associacao_marca_id: string | null;
}


const ProdutoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [imagemProduto, setImagemProduto] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");

  // Form states
  const [nomeComercial, setNomeComercial] = useState("");
  const [principioAtivo, setPrincipioAtivo] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<"oleo" | "capsula" | "creme" | "gel" | "spray" | "outro">("oleo");
  const [concentracaoCBD, setConcentracaoCBD] = useState("");
  const [concentracaoTHC, setConcentracaoTHC] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [volumeQuantidade, setVolumeQuantidade] = useState("");
  
  const [indicacoes, setIndicacoes] = useState<string[]>([]);
  const [selectedIndicacoes, setSelectedIndicacoes] = useState<string[]>([]);
  const [novaIndicacao, setNovaIndicacao] = useState("");

  // Buscar produto do banco
  useEffect(() => {
    const fetchProduto = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setProduto(data);
          setNomeComercial(data.nome_comercial);
          setPrincipioAtivo(data.principio_ativo);
          setFormaFarmaceutica(data.forma_farmaceutica as any);
          setConcentracaoCBD(data.concentracao_cbd || "");
          setConcentracaoTHC(data.concentracao_thc || "");
          setFabricante(data.fabricante || "");
          setVolumeQuantidade(data.volume_quantidade || "");
          setImagemPreview(data.imagem_url || "");

          // Buscar indicações clínicas do produto
          const { data: indicacoesData } = await supabase
            .from('produto_indicacoes')
            .select(`
              indicacoes_clinicas (id, nome)
            `)
            .eq('produto_id', id);

          if (indicacoesData) {
            const indicacoesIds = indicacoesData
              .map(i => (i as any).indicacoes_clinicas?.id)
              .filter(Boolean);
            setSelectedIndicacoes(indicacoesIds);
          }
        }

        // Buscar todas as indicações disponíveis
        const { data: allIndicacoes } = await supabase
          .from('indicacoes_clinicas')
          .select('id, nome')
          .order('nome');

        if (allIndicacoes) {
          setIndicacoes(allIndicacoes.map(i => ({ id: i.id, nome: i.nome })) as any);
        }
      } catch (error: any) {
        console.error('Erro ao buscar produto:', error);
        toast({
          title: "Erro ao carregar produto",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduto();
  }, [id, toast]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImagemProduto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInactivateProduct = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .rpc('inativar_produto', { p_produto_id: id });

      if (error) throw error;

      setShowInactivateDialog(false);
      setProduto(prev => prev ? { ...prev, status: 'inativo' } : null);
      toast({
        title: "Produto inativado com sucesso!",
        className: "bg-card-green border-primary/20",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao inativar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!id) return;
    
    try {
      // Deletar relacionamentos primeiro
      await supabase
        .from('produto_indicacoes')
        .delete()
        .eq('produto_id', id);

      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShowDeleteDialog(false);
      toast({
        title: "Produto excluído com sucesso!",
        className: "bg-card-green border-primary/20",
      });
      navigate("/produtos");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveProduct = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      let imagemUrl = produto?.imagem_url;

      // Upload da imagem se houver
      if (imagemProduto) {
        const fileExt = imagemProduto.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(filePath, imagemProduto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('produtos')
          .getPublicUrl(filePath);

        imagemUrl = publicUrl;
      }

      // Atualizar produto
      const { error: updateError } = await supabase
        .from('produtos')
        .update({
          nome_comercial: nomeComercial,
          principio_ativo: principioAtivo,
          forma_farmaceutica: formaFarmaceutica,
          concentracao_cbd: concentracaoCBD || null,
          concentracao_thc: concentracaoTHC || null,
          fabricante: fabricante || null,
          volume_quantidade: volumeQuantidade || null,
          imagem_url: imagemUrl,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Atualizar indicações clínicas
      await supabase
        .from('produto_indicacoes')
        .delete()
        .eq('produto_id', id);

      if (selectedIndicacoes.length > 0) {
        const { error: indicacoesError } = await supabase
          .from('produto_indicacoes')
          .insert(
            selectedIndicacoes.map(indicacaoId => ({
              produto_id: id,
              indicacao_id: indicacaoId
            }))
          );

        if (indicacoesError) throw indicacoesError;
      }

      setIsEditing(false);
      toast({
        title: "Produto atualizado com sucesso!",
        className: "bg-card-green border-primary/20",
      });

      // Recarregar dados
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateProduct = async () => {
    if (!produto) return;

    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert([{
          nome_comercial: `${produto.nome_comercial} (Cópia)`,
          principio_ativo: produto.principio_ativo,
          forma_farmaceutica: produto.forma_farmaceutica as any,
          concentracao_cbd: produto.concentracao_cbd,
          concentracao_thc: produto.concentracao_thc,
          fabricante: produto.fabricante,
          volume_quantidade: produto.volume_quantidade,
          imagem_url: produto.imagem_url,
          status: produto.status as any,
        }])
        .select()
        .single();

      if (error) throw error;

      // Duplicar indicações
      if (selectedIndicacoes.length > 0) {
        await supabase
          .from('produto_indicacoes')
          .insert(
            selectedIndicacoes.map(indicacaoId => ({
              produto_id: data.id,
              indicacao_id: indicacaoId
            }))
          );
      }

      toast({
        title: "Produto duplicado com sucesso!",
        className: "bg-card-green border-primary/20",
      });

      navigate(`/produtos/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const toggleIndicacao = (indicacaoId: string) => {
    setSelectedIndicacoes(prev => 
      prev.includes(indicacaoId) 
        ? prev.filter(i => i !== indicacaoId)
        : [...prev, indicacaoId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="px-6 py-8 flex items-center justify-center">
          <p>Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-background">

        <div className="px-6 py-8">
          <p>Produto não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-normal"
            onClick={() => navigate("/produtos")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Catálogo de produto &gt; {produto.nome_comercial}
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dados do produto</h1>
          <div className="flex gap-3">
            {!isEditing && (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
                onClick={handleDuplicateProduct}
              >
                <Copy className="h-4 w-4" />
                Duplicar produto
              </Button>
            )}
            {isEditing ? (
              <Button
                className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-[20px]"
                onClick={handleSaveProduct}
                disabled={isSaving}
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Editar produto
              </Button>
            )}
          </div>
        </div>

        {/* Alert */}
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-2">
            Este produto só pode ser comercializado e utilizado com receita médica.
          </AlertDescription>
        </Alert>

        {/* Product Card */}
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6 mb-8">
              <div className="relative">
                {isEditing ? (
                  <div className="w-32 h-32 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80">
                    <input
                      type="file"
                      id="imagem-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="imagem-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
                      {imagemPreview ? (
                        <img 
                          src={imagemPreview} 
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-purple-500" />
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden">
                    {produto.imagem_url ? (
                      <img 
                        src={produto.imagem_url} 
                        alt={produto.nome_comercial}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-purple-500 rounded-sm relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-8 bg-purple-600 rounded-t"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge
                    className={
                      produto.status === "ativo"
                        ? "rounded-full px-4 py-1 font-medium border-none bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                        : "rounded-full px-4 py-1 font-medium border-none bg-muted text-muted-foreground hover:bg-muted"
                    }
                  >
                    {produto.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                
                {isEditing ? (
                  <div className="space-y-4 mb-6">
                    <div>
                      <Label>Nome Comercial</Label>
                      <Input
                        value={nomeComercial}
                        onChange={(e) => setNomeComercial(e.target.value)}
                        placeholder="Nome do produto"
                      />
                    </div>
                  </div>
                ) : (
                  <h2 className="text-xl font-semibold mb-6">{produto.nome_comercial}</h2>
                )}
                
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="gap-2 border-muted-foreground text-muted-foreground hover:bg-muted/10 rounded-[20px]"
                    onClick={() => setShowInactivateDialog(true)}
                  >
                    <span className="text-lg">⊗</span>
                    Inativar produto
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-red-500 text-red-500 hover:bg-red-50 rounded-[20px]"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir produto
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Princípio Ativo</Label>
                {isEditing ? (
                  <Input 
                    value={principioAtivo}
                    onChange={(e) => setPrincipioAtivo(e.target.value)}
                    placeholder="Ex: Canabidiol"
                  />
                ) : (
                  <p className="font-semibold">{produto.principio_ativo}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Forma Farmacêutica</Label>
                {isEditing ? (
                  <select 
                    value={formaFarmaceutica}
                    onChange={(e) => setFormaFarmaceutica(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="oleo">Óleo</option>
                    <option value="capsula">Cápsula</option>
                    <option value="creme">Creme</option>
                    <option value="gel">Gel</option>
                    <option value="spray">Spray</option>
                    <option value="outro">Outro</option>
                  </select>
                ) : (
                  <p className="font-semibold">{produto.forma_farmaceutica}</p>
                )}
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Concentração CBD</Label>
                  {isEditing ? (
                    <Input 
                      value={concentracaoCBD}
                      onChange={(e) => setConcentracaoCBD(e.target.value)}
                      placeholder="Ex: 20mg/ml"
                    />
                  ) : (
                    <p className="font-semibold">{produto.concentracao_cbd || "N/A"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Concentração THC</Label>
                  {isEditing ? (
                    <Input 
                      value={concentracaoTHC}
                      onChange={(e) => setConcentracaoTHC(e.target.value)}
                      placeholder="Ex: 1mg/ml"
                    />
                  ) : (
                    <p className="font-semibold">{produto.concentracao_thc || "N/A"}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Fabricante</Label>
                {isEditing ? (
                  <Input 
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    placeholder="Nome do fabricante"
                  />
                ) : (
                  <p className="font-semibold">{produto.fabricante || "N/A"}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Volume/Quantidade</Label>
                {isEditing ? (
                  <Input 
                    value={volumeQuantidade}
                    onChange={(e) => setVolumeQuantidade(e.target.value)}
                    placeholder="Ex: 30ml"
                  />
                ) : (
                  <p className="font-semibold">{produto.volume_quantidade || "N/A"}</p>
                )}
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-3 block">Indicações clínicas</Label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(indicacoes as any[]).map((indicacao) => (
                        <Badge
                          key={indicacao.id}
                          onClick={() => toggleIndicacao(indicacao.id)}
                          className={`cursor-pointer px-4 py-2 rounded-full ${
                            selectedIndicacoes.includes(indicacao.id)
                              ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                              : 'bg-white text-foreground border border-border hover:bg-gray-50'
                          }`}
                        >
                          {indicacao.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold">
                    {(indicacoes as any[])
                      .filter(i => selectedIndicacoes.includes(i.id))
                      .map(i => i.nome)
                      .join(', ') || 'Nenhuma indicação selecionada'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orientação de uso gerais */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Orientação de uso gerais</h2>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-normal text-primary">Orientações.pdf</p>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inactivate Product Dialog */}
      <AlertDialog open={showInactivateDialog} onOpenChange={setShowInactivateDialog}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between mb-2">
              <AlertDialogTitle className="text-xl font-semibold">
                Deseja inativar produto?
              </AlertDialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowInactivateDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription className="text-base text-foreground">
              Deseja realmente inativar este produto?<br />
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInactivateDialog(false)}
              className="flex-1 rounded-full border-gray-300 text-foreground hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInactivateProduct}
              className="flex-1 rounded-full bg-gray-700 text-white hover:bg-gray-800"
            >
              Inativar produto
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between mb-2">
              <AlertDialogTitle className="text-xl font-semibold">
                Deseja excluir este produto?
              </AlertDialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowDeleteDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription className="text-base text-foreground">
              Deseja realmente excluir este produto?<br />
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 rounded-full border-gray-300 text-foreground hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteProduct}
              className="flex-1 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProdutoDetalhes;
