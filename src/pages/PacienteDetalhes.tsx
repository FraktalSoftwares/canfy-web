import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Upload, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PacienteData {
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
  foto_perfil_url: string;
}

const PacienteDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<PacienteData | null>(null);
  
  const [formData, setFormData] = useState({
    telefone: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
  });

  useEffect(() => {
    if (id) {
      fetchPaciente();
    }
  }, [id]);

  const fetchPaciente = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_paciente', { p_id: id });
      
      if (error) throw error;
      if (data && data.length > 0) {
        const pacienteData = data[0];
        setPaciente(pacienteData);
        setFormData({
          telefone: pacienteData.telefone || "",
          cpf: pacienteData.cpf || "",
          dataNascimento: pacienteData.data_nascimento || "",
          endereco: pacienteData.endereco_completo || "",
        });
      }
    } catch (error) {
      console.error('Error fetching paciente:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do paciente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.rpc('admin_update_paciente', {
        p_id: id,
        p_telefone: formData.telefone,
        p_cpf: formData.cpf,
        p_data_nascimento: formData.dataNascimento,
        p_endereco_completo: formData.endereco,
      });

      if (error) throw error;

      toast({
        title: "Dados atualizados com sucesso!",
        className: "bg-green-50 border-green-200",
      });
      setIsEditing(false);
      fetchPaciente();
    } catch (error) {
      console.error('Error updating paciente:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados do paciente.",
        variant: "destructive",
      });
    }
  };

  const handleInactivateAccount = async () => {
    try {
      const { error } = await supabase.rpc('admin_inativar_paciente', { p_id: id });

      if (error) throw error;

      toast({
        title: "Usuário inativado com sucesso!",
        className: "bg-green-50 border-green-200",
      });
      setShowInactivateDialog(false);
      navigate('/pacientes');
    } catch (error) {
      console.error('Error inactivating paciente:', error);
      toast({
        title: "Erro ao inativar",
        description: "Não foi possível inativar o paciente.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Paciente não encontrado</p>
        </div>
      </div>
    );
  }

  const historicoPagamentos = [
    { data: "01/01/aaaa", tipo: "Consulta", valor: "R$95,00" },
    { data: "01/01/aaaa", tipo: "Pedido", valor: "R$220,00" },
    { data: "01/01/aaaa", tipo: "Consulta", valor: "R$95,00" },
    { data: "01/01/aaaa", tipo: "Pedido", valor: "R$220,00" },
    { data: "01/01/aaaa", tipo: "Consulta", valor: "R$95,00" },
    { data: "01/01/aaaa", tipo: "Pedido", valor: "R$95,00" },
    { data: "01/01/aaaa", tipo: "Pedido", valor: "R$220,00" },
    { data: "01/01/aaaa", tipo: "Consulta", valor: "R$95,00" },
  ];

  const documentosUsuario = [
    { nome: "CPF.jpg", icon: "📄" },
    { nome: "comprovante_de_residencia.jpg", icon: "📄" },
  ];

  const documentosProdutos = [
    { nome: "receita.pdf", icon: "📄" },
    { nome: "automedicao_de_receita.pdf", icon: "📄" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-normal"
            onClick={() => navigate("/pacientes")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <span className="text-sm text-muted-foreground">
            Módulo &gt; {paciente.nome_completo}
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
                      {paciente.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white hover:bg-blue-500 px-3 py-0.5 text-xs">
                    {paciente.ativo ? "ATIVO" : "INATIVO"}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold">{paciente.nome_completo}</h2>
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
                <p className="font-semibold">{paciente.email}</p>
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
                  <p className="font-semibold">{formData.telefone || "N/A"}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Data de nascimento</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})}
                    className="h-9"
                  />
                ) : (
                  <p className="font-semibold">{formatDate(formData.dataNascimento)}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">CPF</p>
                {isEditing ? (
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    className="h-9"
                  />
                ) : (
                  <p className="font-semibold">{formData.cpf}</p>
                )}
              </div>
              <div className="bg-background rounded-lg p-4 col-span-2">
                <p className="text-xs text-muted-foreground mb-2">Endereço</p>
                {isEditing ? (
                  <Input
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    className="h-9"
                  />
                ) : (
                  <p className="font-semibold text-sm">{formData.endereco || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados de uso - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Dados de uso</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Nº de consultas realizadas</p>
                  <p className="text-3xl font-bold">{paciente.total_consultas}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Nº de receitas emitidas</p>
                  <p className="text-3xl font-bold">{paciente.total_consultas}</p>
                </CardContent>
              </Card>
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Nº de pedidos realizados</p>
                  <p className="text-3xl font-bold">{paciente.total_pedidos}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Histórico de pagamentos - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Histórico de pagamentos</h2>
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card-green border-none hover:bg-card-green">
                      <TableHead className="font-semibold text-foreground rounded-tl-[10px]">Data do pagamento</TableHead>
                      <TableHead className="font-semibold text-foreground">Tipo</TableHead>
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
                        <TableCell className="font-normal">{pagamento.tipo}</TableCell>
                        <TableCell className="font-normal">{pagamento.valor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Documentos do usuário */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Documentos do usuário</h2>
          <div className="grid grid-cols-2 gap-4">
            {isEditing ? (
              <>
                {/* Upload area for Documento de identificação */}
                <div>
                  <p className="text-sm font-semibold mb-2">Documento de identificação</p>
                  <p className="text-xs text-muted-foreground mb-2">Formatos aceitos: PDF, PNG, JPG</p>
                  <Card className="rounded-[10px] bg-secondary border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="pt-12 pb-12">
                      <label className="flex flex-col items-center gap-3 cursor-pointer">
                        <Upload className="h-8 w-8 text-primary" />
                        <div className="text-center">
                          <p className="text-sm text-primary font-medium">Clique para adicionar o arquivo</p>
                          <p className="text-xs text-muted-foreground">ou arraste-o até aqui</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                      </label>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Upload area for Comprovante de residência */}
                <div>
                  <p className="text-sm font-semibold mb-2">Comprovante de residência</p>
                  <p className="text-xs text-muted-foreground mb-2">Formatos aceitos: PDF, PNG, JPG</p>
                  <Card className="rounded-[10px] bg-secondary border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="pt-12 pb-12">
                      <label className="flex flex-col items-center gap-3 cursor-pointer">
                        <Upload className="h-8 w-8 text-primary" />
                        <div className="text-center">
                          <p className="text-sm text-primary font-medium">Clique para adicionar o arquivo</p>
                          <p className="text-xs text-muted-foreground">ou arraste-o até aqui</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                      </label>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <>
                {documentosUsuario.map((doc, index) => (
                  <Card key={index} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-normal text-primary">{doc.nome}</p>
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

        {/* Documentos por produtos - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Documentos por produtos</h2>
            <div className="grid grid-cols-2 gap-4">
              {documentosProdutos.map((doc, index) => (
                <Card key={index} className="rounded-[10px] bg-secondary border-none">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-normal text-primary">{doc.nome}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Observações internas - Only show when not editing */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Observações internas</h2>
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="pt-6">
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
        <AlertDialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
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
              className="flex-1 rounded-full"
              onClick={() => setShowInactivateDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-full"
              onClick={handleInactivateAccount}
            >
              Inativar conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PacienteDetalhes;
