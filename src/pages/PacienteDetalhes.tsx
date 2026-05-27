import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, ChevronRight, Check, Copy, Download, MinusCircle,
  Pencil, X, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PacienteData {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  endereco_completo: string;
  genero: string | null;
  total_consultas: number;
  total_receitas: number;
  total_pedidos: number;
  ultimo_acesso: string;
  created_at: string;
  ativo: boolean;
  foto_perfil_url: string | null;
  observacoes_admin: string | null;
}

interface PagamentoRow {
  data_pagamento: string;
  tipo: string;
  valor: number;
  referencia: string;
}

interface DocumentoRow {
  id: string;
  tipo: string;
  nome_arquivo: string;
  arquivo_url: string;
  categoria: "usuario" | "produto";
  created_at: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

const PacienteDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [paciente, setPaciente] = useState<PacienteData | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [showAnvisaDialog, setShowAnvisaDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  const [form, setForm] = useState({
    telefone: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
  });

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [{ data: pacData, error: pacErr }, { data: pagData }, { data: docData }] =
        await Promise.all([
          supabase.rpc("admin_get_paciente", { p_id: id! }),
          supabase.rpc("admin_get_paciente_pagamentos", { p_paciente_id: id! }),
          supabase.rpc("admin_get_paciente_documentos", { p_paciente_id: id! }),
        ]);

      if (pacErr) throw pacErr;
      if (pacData && pacData.length > 0) {
        const p = pacData[0] as PacienteData;
        setPaciente(p);
        setForm({
          telefone: p.telefone || "",
          cpf: p.cpf || "",
          dataNascimento: p.data_nascimento || "",
          endereco: p.endereco_completo || "",
        });
        setObservacoes(p.observacoes_admin || "");
      }
      setPagamentos((pagData as PagamentoRow[]) || []);
      setDocumentos((docData as DocumentoRow[]) || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar paciente", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.rpc("admin_update_paciente", {
        p_id: id!,
        p_telefone: form.telefone,
        p_cpf: form.cpf,
        p_data_nascimento: form.dataNascimento || null,
        p_endereco_completo: form.endereco,
      });
      if (error) throw error;
      toast({ title: "Dados atualizados" });
      setIsEditing(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveObs = async () => {
    try {
      setSavingObs(true);
      const { error } = await supabase.rpc("admin_update_paciente_observacoes", {
        p_id: id!,
        p_observacoes: observacoes,
      });
      if (error) throw error;
      toast({ title: "Observações salvas" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar observações", description: e.message, variant: "destructive" });
    } finally {
      setSavingObs(false);
    }
  };

  const handleInactivate = async () => {
    try {
      const { error } = await supabase.rpc("admin_inativar_paciente", { p_id: id! });
      if (error) throw error;
      toast({ title: "Paciente inativado" });
      setShowInactivateDialog(false);
      navigate("/pacientes");
    } catch (e: any) {
      toast({ title: "Erro ao inativar", description: e.message, variant: "destructive" });
    }
  };

  const anvisaDados = useMemo(() => {
    if (!paciente) return "";
    const lines = [
      `Nome completo: ${paciente.nome_completo}`,
      `CPF: ${paciente.cpf}`,
      `Data de nascimento: ${formatDate(paciente.data_nascimento)}`,
      `E-mail: ${paciente.email}`,
      `Telefone: ${paciente.telefone}`,
      `Endereço: ${paciente.endereco_completo}`,
    ];
    return lines.join("\n");
  }, [paciente]);

  const handleCopyAnvisa = async () => {
    try {
      await navigator.clipboard.writeText(anvisaDados);
      toast({ title: "Dados copiados" });
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
    }
  };

  const docsUsuario = documentos.filter((d) => d.categoria === "usuario");
  const docsProduto = documentos.filter((d) => d.categoria === "produto");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen bg-background">

        <div className="px-6 py-8"><p className="text-muted-foreground">Paciente não encontrado.</p></div>
      </div>
    );
  }

  const initials = paciente.nome_completo.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8 max-w-[1080px] mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-card-green/40 mb-3 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/pacientes" className="hover:text-primary">Pacientes</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{paciente.nome_completo}</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Dados do usuário</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              onClick={() => setShowAnvisaDialog(true)}
            >
              <FileText className="h-4 w-4" />
              Dados solicitação Anvisa
            </Button>
            {!isEditing ? (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Editar paciente
              </Button>
            ) : (
              <Button
                className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-full"
                onClick={handleSave}
              >
                <Check className="h-4 w-4" />
                Salvar alterações
              </Button>
            )}
          </div>
        </div>

        <Card className="rounded-[10px] bg-secondary border-none mb-3">
          <CardContent className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="h-24 w-24">
                <AvatarImage src={paciente.foto_perfil_url ?? undefined} />
                <AvatarFallback className="bg-card-orange text-2xl text-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Badge
                  className={
                    paciente.ativo
                      ? "border-none rounded-full px-3 py-0.5 font-medium mb-1.5 bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                      : "border-none rounded-full px-3 py-0.5 font-medium mb-1.5 bg-muted text-muted-foreground hover:bg-muted"
                  }
                >
                  {paciente.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <h3 className="text-xl font-bold text-foreground">{paciente.nome_completo}</h3>
              </div>
            </div>
            {paciente.ativo && (
              <button
                onClick={() => setShowInactivateDialog(true)}
                className="text-muted-foreground hover:text-destructive flex items-center gap-2 text-sm"
              >
                <MinusCircle className="h-4 w-4" />
                Inativar conta
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="grid grid-cols-2 gap-x-12 gap-y-5 px-6 py-6">
            <Field label="E-mail" value={paciente.email} />
            <Field label="Gênero" value={paciente.genero || "Não informado"} />
            <EditableField
              label="Telefone"
              value={form.telefone || "—"}
              editing={isEditing}
              onChange={(v) => setForm({ ...form, telefone: v })}
              editValue={form.telefone}
            />
            <EditableField
              label="Data de nascimento"
              value={formatDate(form.dataNascimento) || "—"}
              editing={isEditing}
              onChange={(v) => setForm({ ...form, dataNascimento: v })}
              editValue={form.dataNascimento}
              type="date"
            />
            <EditableField
              label="CPF"
              value={form.cpf || "—"}
              editing={isEditing}
              onChange={(v) => setForm({ ...form, cpf: v })}
              editValue={form.cpf}
            />
            <EditableField
              label="Região"
              value={form.endereco || "—"}
              editing={isEditing}
              onChange={(v) => setForm({ ...form, endereco: v })}
              editValue={form.endereco}
            />
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de uso</h2>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <UsageCard label="Nº de consultas realizadas" value={paciente.total_consultas} />
          <UsageCard label="Nº de receitas emitidas" value={paciente.total_receitas} />
          <UsageCard label="Nº de pedidos realizados" value={paciente.total_pedidos} />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Histórico de pagamentos</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary border-none">
                <TableHead className="font-semibold text-white">Data do pagamento</TableHead>
                <TableHead className="font-semibold text-white">Tipo</TableHead>
                <TableHead className="font-semibold text-white">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento registrado
                  </TableCell>
                </TableRow>
              ) : (
                pagamentos.map((p, i) => (
                  <TableRow key={i} className="bg-card border-b border-border/40 hover:bg-muted/30">
                    <TableCell>{formatDate(p.data_pagamento)}</TableCell>
                    <TableCell>{p.tipo}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(p.valor))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Documentos do usuário</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {docsUsuario.length === 0 ? (
            <p className="text-muted-foreground italic col-span-2">Nenhum documento enviado.</p>
          ) : (
            docsUsuario.map((doc) => <DocCard key={doc.id} doc={doc} />)
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Documentos por produtos</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {docsProduto.length === 0 ? (
            <p className="text-muted-foreground italic col-span-2">Nenhum documento de produto.</p>
          ) : (
            docsProduto.map((doc) => <DocCard key={doc.id} doc={doc} />)
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Observações internas</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-4">
          <CardContent className="px-6 py-5">
            <label className="text-sm font-semibold text-foreground mb-2 block">Observações</label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações internas ou anotações administrativas..."
              className="min-h-[150px] bg-background border-border resize-none"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleSaveObs}
                disabled={savingObs}
                className="bg-primary text-white hover:bg-primary-dark rounded-full"
              >
                {savingObs ? "Salvando..." : "Salvar observações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAnvisaDialog} onOpenChange={setShowAnvisaDialog}>
        <DialogContent className="sm:max-w-[560px] p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Dados para solicitação Anvisa</DialogTitle>
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setShowAnvisaDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Copie os dados abaixo e cole no portal gov.br para abrir a solicitação Anvisa.
          </p>
          <pre className="bg-card-green/40 text-foreground rounded-[10px] p-4 text-sm whitespace-pre-wrap font-mono max-h-[280px] overflow-auto">
{anvisaDados}
          </pre>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setShowAnvisaDialog(false)}
            >
              Fechar
            </Button>
            <Button
              className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full gap-2"
              onClick={handleCopyAnvisa}
            >
              <Copy className="h-4 w-4" />
              Copiar dados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showInactivateDialog} onOpenChange={setShowInactivateDialog}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between mb-2">
              <AlertDialogTitle className="text-xl font-semibold">Deseja inativar conta?</AlertDialogTitle>
              <Button
                variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => setShowInactivateDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription className="text-base text-foreground">
              Deseja realmente inativar esta conta?<br />Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowInactivateDialog(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full" onClick={handleInactivate}>
              Inativar conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/40 pb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-foreground break-words">{value}</p>
    </div>
  );
}

function EditableField({
  label, value, editing, onChange, editValue, type,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  editValue: string;
  type?: string;
}) {
  return (
    <div className="border-b border-border/40 pb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {editing ? (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 bg-background border-border"
        />
      ) : (
        <p className="text-base font-bold text-foreground break-words">{value}</p>
      )}
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-[10px] bg-secondary border-none">
      <CardContent className="px-6 py-5">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function DocCard({ doc }: { doc: DocumentoRow }) {
  return (
    <Card className="rounded-[10px] bg-secondary border-none">
      <CardContent className="px-6 py-4 flex items-center justify-between">
        <a
          href={doc.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium hover:underline truncate"
        >
          {doc.nome_arquivo}
        </a>
        <a
          href={doc.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-dark shrink-0"
          aria-label="Baixar"
        >
          <Download className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}

export default PacienteDetalhes;
