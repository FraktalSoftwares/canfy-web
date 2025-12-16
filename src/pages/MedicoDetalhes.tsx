import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Upload, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MedicoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Form states
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    crm: "",
    uf_crm: "",
    especialidade_nome: "",
    status: "",
    total_atendimentos: 0,
    ultimo_acesso: "",
  });

  // Buscar dados do médico
  useEffect(() => {
    const fetchMedico = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await (supabase.rpc as any)('admin_get_medico', { p_id: id });

        if (error) throw error;

        if (data && data.length > 0) {
          const medico = data[0];
          setFormData({
            nome: medico.nome || "",
            email: medico.email || "",
            telefone: medico.telefone || "",
            crm: medico.crm || "",
            uf_crm: medico.uf_crm || "",
            especialidade_nome: medico.especialidade_nome || "",
            status: medico.status || "",
            total_atendimentos: medico.total_atendimentos || 0,
            ultimo_acesso: medico.ultimo_acesso || "",
          });
        }
      } catch (error: any) {
        console.error('Erro ao buscar médico:', error);
        toast({
          title: "Erro ao carregar médico",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedico();
  }, [id, toast]);

  const handleSave = async () => {
    if (!id) return;

    try {
      const { error } = await (supabase.rpc as any)('admin_update_medico', {
        p_id: id,
        p_email: formData.email,
        p_telefone: formData.telefone,
        p_crm: formData.crm,
        p_uf_crm: formData.uf_crm,
      });

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Dados salvos com sucesso!",
        className: "bg-green-50 border-green-200",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar médico:', error);
      toast({
        title: "Erro ao salvar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInactivateAccount = async () => {
    if (!id) return;

    try {
      const { error } = await (supabase.rpc as any)('admin_inativar_medico', { p_id: id });

      if (error) throw error;

      setShowInactivateDialog(false);
      toast({
        title: "Usuário inativado com sucesso!",
        className: "bg-green-50 border-green-200",
      });
      navigate("/medicos");
    } catch (error: any) {
      console.error('Erro ao inativar médico:', error);
      toast({
        title: "Erro ao inativar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "N/A";
    }
  };

  const getInitials = (nome: string) => {
    const parts = nome.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  // Mock data para histórico e documentos (em produção vir do banco)
  const historicoPagamentos = [
    { data: "01/04/2025", valor: "R$95,00" },
    { data: "01/05/2025", valor: "R$220,00" },
    { data: "01/04/2025", valor: "R$125,00" },
    { data: "01/07/2025", valor: "R$120,00" },
    { data: "01/08/2025", valor: "R$175,00" },
    { data: "01/09/2025", valor: "R$175,00" },
    { data: "01/10/2025", valor: "R$89,80" },
    { data: "01/11/2025", valor: "R$120,00" },
  ];

  const documentosUsuario = [
    "CNH.jpg",
    "comprovante.crm.jpg",
    "certificadoPrescritor.jpg",
    "Diploma.pdf",
    "certificado_complementar.jpg",
    "outros_documentos.jpg"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <p className="text-center py-8">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-normal"
            onClick={() => navigate("/medicos")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <span className="text-sm text-muted-foreground">
            Médicos &gt; {formData.nome}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dados do usuário</h1>
          {!isEditing ? (
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-[20px]"
              onClick={() => setIsEditing(true)}
            >
              Editar dados
            </Button>
          ) : (
            <Button
              className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-[20px]"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
              Salvar alterações
            </Button>
          )}
        </div>

        {/* User Info Section */}
        <Card className="rounded-[10px] bg-secondary border-none mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-orange-400 text-white text-2xl">
                      {getInitials(formData.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className={`absolute -top-2 left-1/2 -translate-x-1/2 ${formData.status === "ativo" ? "bg-blue-500" : "bg-gray-400"} text-white hover:${formData.status === "ativo" ? "bg-blue-500" : "bg-gray-400"} px-3 py-0.5 text-xs`}>
                    {formData.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold">{formData.nome}</h2>
              </div>
              <Button
                variant="link"
                className="text-muted-foreground p-0 h-auto text-sm font-normal flex items-center gap-1"
                onClick={() => setShowInactivateDialog(true)}
              >
                <span className="text-lg">⊗</span>
                Inativar conta
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">E-mail</p>
                {isEditing ? (
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-9"
                  />
                ) : (
                  <p className="font-semibold">{formData.email}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Especialidade</p>
                <p className="font-semibold">{formData.especialidade_nome}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Telefone</p>
                {isEditing ? (
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    className="h-9"
                  />
                ) : (
                  <p className="font-semibold">{formData.telefone || "Não informado"}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Nº de atendimento realizados</p>
                <p className="font-semibold">{formData.total_atendimentos}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">CRM+UF</p>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.crm}
                      onChange={(e) => setFormData({...formData, crm: e.target.value})}
                      className="h-9"
                      placeholder="CRM"
                    />
                    <Input
                      value={formData.uf_crm}
                      onChange={(e) => setFormData({...formData, uf_crm: e.target.value})}
                      className="h-9 w-20"
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                ) : (
                  <p className="font-semibold">{formData.crm}-{formData.uf_crm}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Último acesso</p>
                <p className="font-semibold text-sm">{formatDate(formData.ultimo_acesso)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados de uso - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Dados de uso</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Nº de atendimento realizados</p>
                  <p className="text-3xl font-bold">{formData.total_atendimentos}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Nº de receitas emitidas</p>
                  <p className="text-3xl font-bold">{formData.total_atendimentos}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Documentos do usuário */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Documentos do usuário</h2>
          <div className="grid grid-cols-3 gap-4">
            {isEditing ? (
              <>
                {documentosUsuario.map((docName, index) => (
                  <div key={index}>
                    <p className="text-sm font-semibold mb-2">{docName}</p>
                    <p className="text-xs text-muted-foreground mb-2">Formatos aceitos: PDF, PNG, JPG</p>
                    <Card className="rounded-[10px] bg-secondary border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="pt-8 pb-8">
                        <label className="flex flex-col items-center gap-2 cursor-pointer">
                          <Upload className="h-6 w-6 text-primary" />
                          <div className="text-center">
                            <p className="text-xs text-primary font-medium">Clique para adicionar o arquivo</p>
                            <p className="text-xs text-muted-foreground">ou arraste-o até aqui</p>
                          </div>
                          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                        </label>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </>
            ) : (
              <>
                {documentosUsuario.map((doc, index) => (
                  <Card key={index} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-normal text-primary">{doc}</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Histórico de repasses - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Histórico de repasses</h2>
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card-green border-none hover:bg-card-green">
                      <TableHead className="font-semibold text-foreground rounded-tl-[10px]">Data do repasse</TableHead>
                      <TableHead className="font-semibold text-foreground rounded-tr-[10px]">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoPagamentos.map((pagamento, index) => (
                      <TableRow 
                        key={index}
                        className={`hover:bg-muted/50 ${index % 2 === 0 ? 'bg-card' : 'bg-card-green/30'}`}
                      >
                        <TableCell className="font-normal">{pagamento.data}</TableCell>
                        <TableCell className="font-normal">{pagamento.valor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Observações internas - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Observações internas</h2>
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-2">Observações</p>
                <Textarea
                  placeholder="Observações internas da avaliação administrativa..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="min-h-[150px] bg-background border-none resize-none"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Inactivate Account Dialog */}
      <AlertDialog open={showInactivateDialog} onOpenChange={setShowInactivateDialog}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 bg-gray-50 [&>button]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between mb-2">
              <AlertDialogTitle className="text-xl font-semibold">
                Deseja inativar conta?
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
              Deseja realmente inativar esta conta?<br />
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInactivateDialog(false)}
              className="flex-1 rounded-[20px] border-primary text-primary hover:bg-primary/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInactivateAccount}
              className="flex-1 rounded-[20px] bg-primary text-white hover:bg-primary-dark"
            >
              Inativar conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MedicoDetalhes;