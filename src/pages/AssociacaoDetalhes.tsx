import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Pencil, Check, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AssociacaoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    cnpj: "",
    telefone: "",
    email: "",
    regiao: "",
    status: "",
  });
  
  const [observacoes, setObservacoes] = useState("");

  // Buscar dados da associação
  useEffect(() => {
    const fetchAssociacao = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await (supabase.rpc as any)('admin_get_associacao', { p_id: id });

        if (error) throw error;

        if (data && data.length > 0) {
          const assoc = data[0];
          setFormData({
            nome: assoc.nome || "",
            tipo: assoc.tipo || "",
            cnpj: assoc.cnpj || "",
            telefone: assoc.telefone || "",
            email: assoc.email || "",
            regiao: assoc.regiao || "",
            status: assoc.status || "",
          });
          setObservacoes(assoc.observacoes || "");
        }
      } catch (error: any) {
        console.error('Erro ao buscar associação:', error);
        toast({
          title: "Erro ao carregar associação",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssociacao();
  }, [id, toast]);

  const handleSave = async () => {
    if (!id) return;

    try {
      const { error } = await (supabase.rpc as any)('admin_update_associacao', {
        p_id: id,
        p_nome: formData.nome,
        p_cnpj: formData.cnpj || null,
        p_email: formData.email || null,
        p_telefone: formData.telefone || null,
        p_regiao: formData.regiao || null,
        p_observacoes: observacoes || null,
      });

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Dados salvos com sucesso!",
        className: "bg-green-50 border-green-200",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar associação:', error);
      toast({
        title: "Erro ao salvar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await (supabase.rpc as any)('admin_inativar_associacao', { p_id: id });

      if (error) throw error;

      setShowDeleteDialog(false);
      toast({
        title: "Associação removida com sucesso!",
        className: "bg-green-50 border-green-200",
      });
      navigate("/associacoes");
    } catch (error: any) {
      console.error('Erro ao remover associação:', error);
      toast({
        title: "Erro ao remover associação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const produtos = [
    { id: 1, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 2, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 3, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 4, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 5, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 6, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 7, nome: "Canabidiol", subtitulo: "Óleo" },
    { id: 8, nome: "Canabidiol", subtitulo: "Óleo" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="px-6 py-8 max-w-5xl mx-auto">
          <p className="text-center py-8">Carregando...</p>
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
            onClick={() => navigate("/associacoes")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Associações e marcas &gt; {formData.nome}
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dados da associação/marca</h1>
          {isEditing ? (
            <Button
              className="gap-2 bg-green-600 text-white hover:bg-green-700 rounded-[20px]"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
              Salvar alterações
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2 border-green-600 text-green-600 hover:bg-green-50 rounded-[20px]"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar associação/marca
            </Button>
          )}
        </div>

        {/* Main Card */}
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    formData.status === "ativo"
                      ? "rounded-full px-4 py-1 font-medium border-none bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                      : "rounded-full px-4 py-1 font-medium border-none bg-muted text-muted-foreground hover:bg-muted"
                  }
                >
                  {formData.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {!isEditing && (
                <Button
                  variant="link"
                  className="text-red-500 p-0 h-auto text-sm font-normal flex items-center gap-1"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover associação/marca
                </Button>
              )}
            </div>

            <div className="space-y-1 mb-6">
              <p className="text-xs text-muted-foreground capitalize">{formData.tipo}</p>
              {isEditing ? (
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="h-9 font-semibold bg-white"
                />
              ) : (
                <h2 className="text-xl font-semibold">{formData.nome}</h2>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">CNPJ</label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                  className="h-11 bg-white"
                  disabled={!isEditing}
                  placeholder="Não informado"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Telefone</label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="h-11 bg-white"
                  disabled={!isEditing}
                  placeholder="Não informado"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">E-mail institucional</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="h-11 bg-white"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Região</label>
                <Input
                  value={formData.regiao}
                  onChange={(e) => setFormData({...formData, regiao: e.target.value})}
                  className="h-11 bg-white"
                  disabled={!isEditing}
                  placeholder="Não informado"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Observações</label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações internas ou anotações administrativas..."
                  className="min-h-[120px] bg-white resize-none"
                  disabled={!isEditing}
                />
                <p className="text-xs text-right text-muted-foreground mt-1">{observacoes.length}/500</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <RequisitosAssociacao associacaoId={id!} />

        {/* Produtos que fornecem */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Produtos que fornecem</h2>
          <div className="grid grid-cols-4 gap-4">
            {produtos.map((produto) => (
              <Card key={produto.id} className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6 pb-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center mb-3">
                      <div className="w-8 h-10 bg-green-600 rounded-sm relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-green-700 rounded-t"></div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{produto.nome}</p>
                    <p className="text-xs text-muted-foreground">{produto.subtitulo}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between mb-2">
              <AlertDialogTitle className="text-xl font-semibold">
                Deseja remover associação/marca?
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
              Deseja realmente remover esta associação/marca?<br />
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
              onClick={handleDelete}
              className="flex-1 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              Remover
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface ProdutoMini {
  id: string;
  nome_comercial: string;
}

function RequisitosAssociacao({ associacaoId }: { associacaoId: string }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<string[]>([]);
  const [novoDoc, setNovoDoc] = useState("");
  const [produtos, setProdutos] = useState<ProdutoMini[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!associacaoId) return;
    (async () => {
      try {
        const [a, p] = await Promise.all([
          supabase.from("associacoes_marcas").select("documentos_obrigatorios, produtos_ids").eq("id", associacaoId).maybeSingle(),
          supabase.from("produtos").select("id, nome_comercial").eq("status", "ativo").order("nome_comercial"),
        ]);
        if (a.data) {
          setDocs((a.data.documentos_obrigatorios as string[]) || []);
          setSelectedProdutos((a.data.produtos_ids as string[]) || []);
        }
        setProdutos((p.data as ProdutoMini[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar requisitos", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [associacaoId, toast]);

  const addDoc = () => {
    const v = novoDoc.trim();
    if (!v || docs.includes(v)) return;
    setDocs([...docs, v]);
    setNovoDoc("");
  };

  const removeDoc = (d: string) => setDocs(docs.filter((x) => x !== d));

  const toggleProduto = (id: string) => {
    setSelectedProdutos((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from("associacoes_marcas").update({
        documentos_obrigatorios: docs,
        produtos_ids: selectedProdutos,
      }).eq("id", associacaoId);
      if (error) throw error;
      toast({ title: "Requisitos salvos" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Requisitos para pacientes</h2>
      <Card className="rounded-[10px] bg-secondary border-none">
        <CardContent className="px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-semibold mb-2 block">Documentos extras obrigatórios</label>
            <p className="text-xs text-muted-foreground mb-3">Documentos que pacientes precisam enviar para receber produtos desta associação/marca.</p>
            <div className="flex gap-2 mb-3">
              <Input
                value={novoDoc}
                onChange={(e) => setNovoDoc(e.target.value)}
                placeholder="Ex.: Laudo médico, Tomografia..."
                className="h-10 max-w-[360px]"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDoc(); } }}
              />
              <Button
                variant="outline"
                onClick={addDoc}
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              >
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {docs.length === 0 ? (
                <p className="text-muted-foreground italic text-sm">Nenhum documento obrigatório.</p>
              ) : (
                docs.map((d) => (
                  <Badge key={d} className="border-none rounded-full px-3 py-1 gap-2 bg-card-green text-primary-dark hover:bg-card-green">
                    {d}
                    <button onClick={() => removeDoc(d)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">Produtos disponíveis</label>
            <p className="text-xs text-muted-foreground mb-3">Selecione os produtos fornecidos por esta associação/marca.</p>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {produtos.length === 0 ? (
                <p className="text-muted-foreground italic text-sm">Nenhum produto cadastrado.</p>
              ) : (
                produtos.map((p) => {
                  const sel = selectedProdutos.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduto(p.id)}
                      className={
                        sel
                          ? "rounded-full px-3 py-1.5 text-sm bg-primary text-white"
                          : "rounded-full px-3 py-1.5 text-sm border border-border bg-background hover:bg-muted"
                      }
                    >
                      {p.nome_comercial}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white hover:bg-primary-dark rounded-full"
            >
              {saving ? "Salvando..." : "Salvar requisitos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AssociacaoDetalhes;