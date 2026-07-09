import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, AlertCircle, Check, CloudUpload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productSchema } from "@/lib/validations";
import { getUserFriendlyError, getValidationError } from "@/lib/errorUtils";

const ProdutoCadastro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [nomeComercial, setNomeComercial] = useState("");
  const [principioAtivo, setPrincipioAtivo] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState("");
  const [concentracaoCBD, setConcentracaoCBD] = useState("");
  const [concentracaoTHC, setConcentracaoTHC] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [volumeQuantidade, setVolumeQuantidade] = useState("");
  const [tipoOrigem, setTipoOrigem] = useState<"nacional" | "internacional">("nacional");
  const [precoBrl, setPrecoBrl] = useState("");
  const [precoUsd, setPrecoUsd] = useState("");
  const [pesoG, setPesoG] = useState("100");
  const [larguraCm, setLarguraCm] = useState("11");
  const [alturaCm, setAlturaCm] = useState("2");
  const [comprimentoCm, setComprimentoCm] = useState("16");
  const [orientacoes, setOrientacoes] = useState("");
  const [imagemProduto, setImagemProduto] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");
  const [documentoOrientacao, setDocumentoOrientacao] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProduct = async (status: 'ativo' | 'inativo') => {
    setIsSaving(true);

    try {
      // Validate input using zod
      const validatedData = productSchema.parse({
        nome_comercial: nomeComercial,
        principio_ativo: principioAtivo,
        forma_farmaceutica: formaFarmaceutica,
        concentracao_cbd: concentracaoCBD || undefined,
        concentracao_thc: concentracaoTHC || undefined,
        fabricante: fabricante || undefined,
        volume_quantidade: volumeQuantidade || undefined,
        status,
        peso_g: Number(pesoG),
        largura_cm: Number(larguraCm),
        altura_cm: Number(alturaCm),
        comprimento_cm: Number(comprimentoCm),
      });

      let imagemUrl = null;

      // Upload da imagem se houver
      if (imagemProduto) {
        const fileExt = imagemProduto.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(filePath, imagemProduto);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('produtos')
          .getPublicUrl(filePath);

        imagemUrl = publicUrl;
      }

      // Usar a função RPC para criar o produto
      const { data: newProductId, error: insertError } = await supabase.rpc('create_produto', {
        p_nome_comercial: validatedData.nome_comercial,
        p_principio_ativo: validatedData.principio_ativo,
        p_forma_farmaceutica: validatedData.forma_farmaceutica,
        p_concentracao_cbd: validatedData.concentracao_cbd || '',
        p_concentracao_thc: validatedData.concentracao_thc || '',
        p_fabricante: validatedData.fabricante || '',
        p_volume_quantidade: validatedData.volume_quantidade || '',
        p_imagem_url: imagemUrl || '',
        p_status: validatedData.status,
        p_peso_g: validatedData.peso_g,
        p_largura_cm: validatedData.largura_cm,
        p_altura_cm: validatedData.altura_cm,
        p_comprimento_cm: validatedData.comprimento_cm,
      });

      if (insertError) {
        throw insertError;
      }

      if (newProductId) {
        await supabase.from("produtos").update({
          tipo_origem: tipoOrigem,
          preco_brl: precoBrl ? Number(precoBrl) : null,
          preco_usd: precoUsd ? Number(precoUsd) : null,
        }).eq("id", newProductId as unknown as string);
      }

      toast({
        title: status === 'ativo' ? "Produto publicado!" : "Rascunho salvo!",
        description: status === 'ativo' 
          ? "O produto foi cadastrado e publicado com sucesso." 
          : "O produto foi salvo como rascunho.",
      });

      navigate("/produtos");
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        toast({
          title: "Erro de validação",
          description: getValidationError(error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar produto",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo e tamanho
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, envie uma imagem JPG, PNG ou WEBP.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setImagemProduto(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagemProduto(null);
    setImagemPreview("");
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentoOrientacao(file);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8 max-w-7xl mx-auto">
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
            Catálogo de produtos &gt; Novo produto
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dados básicos</h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={() => handleSaveProduct('inativo')}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-[20px]"
              onClick={() => handleSaveProduct('ativo')}
              disabled={isSaving}
            >
              <Check className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar e publicar produto"}
            </Button>
          </div>
        </div>

        {/* Alert */}
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-2">
            Este produto só pode ser comercializado e utilizado com receita médica.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Left Card - Form Fields */}
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6 space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Nome comercial *</label>
                <Input
                  value={nomeComercial}
                  onChange={(e) => setNomeComercial(e.target.value)}
                  placeholder="Ex.: Óleo Canabidiol 20mg/ml"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Princípio ativo *</label>
                <Input
                  value={principioAtivo}
                  onChange={(e) => setPrincipioAtivo(e.target.value)}
                  placeholder="Ex.: Canabidiol (CBD)"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Forma farmacêutica *</label>
                <Select value={formaFarmaceutica} onValueChange={setFormaFarmaceutica}>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oleo">Óleo</SelectItem>
                    <SelectItem value="capsula">Cápsula</SelectItem>
                    <SelectItem value="creme">Creme</SelectItem>
                    <SelectItem value="gel">Gel</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Concentração CBD</label>
                <Input
                  value={concentracaoCBD}
                  onChange={(e) => setConcentracaoCBD(e.target.value)}
                  placeholder="Ex.: 20mg/ml"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Concentração THC</label>
                <Input
                  value={concentracaoTHC}
                  onChange={(e) => setConcentracaoTHC(e.target.value)}
                  placeholder="Ex.: 1mg/ml"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Fabricante</label>
                <Input
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                  placeholder="Ex.: Laboratório ABC"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Volume/Quantidade</label>
                <Input
                  value={volumeQuantidade}
                  onChange={(e) => setVolumeQuantidade(e.target.value)}
                  placeholder="Ex.: 30ml"
                  className="h-11 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Origem</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoOrigem("nacional")}
                    className={
                      tipoOrigem === "nacional"
                        ? "flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold"
                        : "flex-1 h-11 rounded-full border border-border bg-background text-sm hover:bg-muted"
                    }
                  >
                    Nacional
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoOrigem("internacional")}
                    className={
                      tipoOrigem === "internacional"
                        ? "flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold"
                        : "flex-1 h-11 rounded-full border border-border bg-background text-sm hover:bg-muted"
                    }
                  >
                    Internacional
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Preço (R$)</label>
                  <Input
                    type="number" step="0.01"
                    value={precoBrl}
                    onChange={(e) => setPrecoBrl(e.target.value)}
                    placeholder="Ex.: 140.00"
                    className="h-11 bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Preço (US$)</label>
                  <Input
                    type="number" step="0.01"
                    value={precoUsd}
                    onChange={(e) => setPrecoUsd(e.target.value)}
                    placeholder="Ex.: 28.00"
                    disabled={tipoOrigem === "nacional"}
                    className="h-11 bg-background disabled:opacity-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Card - Image Upload */}
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <label className="text-sm font-semibold mb-4 block">Anexar imagem</label>
              
              {!imagemPreview ? (
                <div className="border-2 border-dashed border-primary/30 rounded-lg bg-background hover:border-primary/50 transition-colors">
                  <label className="flex flex-col items-center justify-center py-20 cursor-pointer">
                    <CloudUpload className="h-12 w-12 text-primary mb-4" />
                    <p className="text-sm text-primary font-medium text-center">
                      Clique para adicionar a imagem do produto<br />
                      ou arraste até aqui
                    </p>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={imagemPreview} 
                    alt="Preview do produto" 
                    className="w-full h-auto rounded-lg object-cover"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleRemoveImage}
                    >
                      Remover imagem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => document.getElementById('image-upload-input')?.click()}
                    >
                      Alterar imagem
                    </Button>
                  </div>
                  <input 
                    id="image-upload-input"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {imagemProduto?.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dimensões e peso (cotação Melhor Envio) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Dimensões e peso para envio</h2>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-4">
                Usado no cálculo do frete pelo Melhor Envio. Informe a embalagem fechada do produto.
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Peso (g) *</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={pesoG}
                    onChange={(e) => setPesoG(e.target.value)}
                    placeholder="Ex.: 250"
                    className="h-11 bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Largura (cm) *</label>
                  <Input
                    type="number"
                    min="11"
                    step="0.1"
                    value={larguraCm}
                    onChange={(e) => setLarguraCm(e.target.value)}
                    placeholder="Mín. 11"
                    className="h-11 bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Altura (cm) *</label>
                  <Input
                    type="number"
                    min="2"
                    step="0.1"
                    value={alturaCm}
                    onChange={(e) => setAlturaCm(e.target.value)}
                    placeholder="Mín. 2"
                    className="h-11 bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Comprimento (cm) *</label>
                  <Input
                    type="number"
                    min="16"
                    step="0.1"
                    value={comprimentoCm}
                    onChange={(e) => setComprimentoCm(e.target.value)}
                    placeholder="Mín. 16"
                    className="h-11 bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orientações de uso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Orientações de uso</h2>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={() => document.getElementById('document-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload de documento
            </Button>
            <input
              id="document-upload"
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleDocumentUpload}
            />
          </div>

          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <label className="text-sm font-semibold mb-2 block">Orientações de uso</label>
              <Textarea
                value={orientacoes}
                onChange={(e) => setOrientacoes(e.target.value)}
                placeholder="Digite instruções de uso ou anexe um documento em PDF"
                className="min-h-[200px] bg-background border-none resize-none"
              />
              {documentoOrientacao && (
                <p className="text-xs text-primary mt-2">
                  Documento anexado: {documentoOrientacao.name}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
            onClick={() => handleSaveProduct('inativo')}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-[20px]"
            onClick={() => handleSaveProduct('ativo')}
            disabled={isSaving}
          >
            <Check className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar e publicar produto"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProdutoCadastro;
