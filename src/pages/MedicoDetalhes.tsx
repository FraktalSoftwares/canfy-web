import { useEffect, useState } from "react";
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
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, ChevronRight, Check, MinusCircle, Pencil, X, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  crm: string;
  uf_crm: string;
  especialidade_nome: string;
  status: string;
  total_atendimentos: number;
  total_receitas: number;
  total_ausencias: number;
  ultimo_acesso: string | null;
  created_at: string;
  user_id: string | null;
  foto_perfil_url: string | null;
  endereco_profissional: string | null;
  tempo_atuacao_anos: number | null;
  observacoes_admin: string | null;
}

const LIMITE_AUSENCIAS_ANO = 15;

interface DocumentoRow {
  id: string;
  tipo: string;
  nome_arquivo: string;
  arquivo_url: string;
  created_at: string;
}

interface RepasseRow {
  id: string;
  data_repasse: string;
  valor: number;
  status: string;
  observacao: string | null;
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

const formatDateTime = (d: string | null) => {
  if (!d) return "Nunca";
  try {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
};

const MedicoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [medico, setMedico] = useState<MedicoData | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([]);
  const [repasses, setRepasses] = useState<RepasseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  const [form, setForm] = useState({
    telefone: "",
    crm: "",
    uf_crm: "",
    email: "",
    cpf: "",
  });

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [m, d, r] = await Promise.all([
        supabase.rpc("admin_get_medico", { p_id: id! }),
        supabase.rpc("admin_get_medico_documentos", { p_medico_id: id! }),
        supabase.rpc("admin_get_medico_repasses", { p_medico_id: id! }),
      ]);

      if (m.error) throw m.error;
      if (m.data && m.data.length > 0) {
        const md = m.data[0] as MedicoData;
        setMedico(md);
        setForm({
          telefone: md.telefone || "",
          crm: md.crm || "",
          uf_crm: md.uf_crm || "",
          email: md.email || "",
          cpf: md.cpf || "",
        });
        setObservacoes(md.observacoes_admin || "");
      }
      setDocumentos((d.data as DocumentoRow[]) || []);
      setRepasses((r.data as RepasseRow[]) || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar médico", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.rpc("admin_update_medico", {
        p_id: id!,
        p_email: form.email,
        p_telefone: form.telefone,
        p_crm: form.crm,
        p_uf_crm: form.uf_crm,
        p_cpf: form.cpf || null,
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
      const { error } = await supabase.rpc("admin_update_medico_observacoes", {
        p_id: id!,
        p_observacoes: observacoes,
      });
      if (error) throw error;
      toast({ title: "Observações salvas" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingObs(false);
    }
  };

  const handleInactivate = async () => {
    try {
      const { error } = await supabase.rpc("admin_inativar_medico", { p_id: id! });
      if (error) throw error;
      toast({ title: "Médico inativado" });
      setShowInactivateDialog(false);
      navigate("/medicos");
    } catch (e: any) {
      toast({ title: "Erro ao inativar", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!medico) {
    return (
      <div className="min-h-screen bg-background">

        <div className="px-6 py-8"><p className="text-muted-foreground">Médico não encontrado.</p></div>
      </div>
    );
  }

  const ativo = medico.status === "ativo";
  const initials = medico.nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

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
          <Link to="/medicos" className="hover:text-primary">Médicos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{medico.nome}</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Dados do usuário</h2>
          {!isEditing ? (
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar médico
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

        <Card className="rounded-[10px] bg-secondary border-none mb-3">
          <CardContent className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="h-24 w-24">
                <AvatarImage src={medico.foto_perfil_url ?? undefined} />
                <AvatarFallback className="bg-card-orange text-2xl text-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Badge
                  className={
                    ativo
                      ? "border-none rounded-full px-3 py-0.5 font-medium mb-1.5 bg-card-purple text-[hsl(291_47%_35%)] hover:bg-card-purple"
                      : "border-none rounded-full px-3 py-0.5 font-medium mb-1.5 bg-muted text-muted-foreground hover:bg-muted"
                  }
                >
                  {ativo ? "Ativo" : "Inativo"}
                </Badge>
                <h3 className="text-xl font-bold text-foreground">{medico.nome}</h3>
              </div>
            </div>
            {ativo && (
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
            <EditableField
              label="E-mail" editing={isEditing}
              value={form.email || "—"} editValue={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field label="Especialidade" value={medico.especialidade_nome} />
            <EditableField
              label="Telefone" editing={isEditing}
              value={form.telefone || "—"} editValue={form.telefone}
              onChange={(v) => setForm({ ...form, telefone: v })}
            />
            <EditableField
              label="CPF" editing={isEditing}
              value={form.cpf || "—"} editValue={form.cpf}
              onChange={(v) => setForm({ ...form, cpf: v })}
            />
            <Field label="Nº de atendimento" value={String(medico.total_atendimentos)} />
            <div className="border-b border-border/40 pb-3">
              <p className="text-xs text-muted-foreground mb-1">CRM+UF</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={form.crm}
                    onChange={(e) => setForm({ ...form, crm: e.target.value })}
                    className="h-8 bg-background border-border flex-1"
                    placeholder="CRM"
                  />
                  <Input
                    value={form.uf_crm}
                    onChange={(e) => setForm({ ...form, uf_crm: e.target.value })}
                    className="h-8 bg-background border-border w-16"
                    placeholder="UF"
                  />
                </div>
              ) : (
                <p className="text-base font-bold text-foreground">{form.crm}-{form.uf_crm}</p>
              )}
            </div>
            <Field label="Último acesso" value={formatDateTime(medico.ultimo_acesso)} />
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de uso</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <UsageCard label="Nº de atendimento realizadas" value={medico.total_atendimentos} />
          <UsageCard label="Nº de receitas emitidas" value={medico.total_receitas} />
        </div>
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ausências em consultas (no ano)</p>
                <p
                  className={`text-3xl font-bold ${
                    medico.total_ausencias > LIMITE_AUSENCIAS_ANO
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {medico.total_ausencias} / {LIMITE_AUSENCIAS_ANO}
                </p>
              </div>
              <div className="text-right">
                {medico.total_ausencias === 0 ? (
                  <Badge className="border-none rounded-full px-3 py-1 bg-card-green text-[hsl(var(--primary-dark))] hover:bg-card-green">
                    Sem faltas no ano
                  </Badge>
                ) : medico.total_ausencias > LIMITE_AUSENCIAS_ANO ? (
                  <Badge className="border-none rounded-full px-3 py-1 bg-card-red text-destructive hover:bg-card-red">
                    Tolerância excedida
                  </Badge>
                ) : (
                  <Badge className="border-none rounded-full px-3 py-1 bg-card-yellow text-[hsl(45_100%_35%)] hover:bg-card-yellow">
                    Dentro da tolerância
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Tolerância: {LIMITE_AUSENCIAS_ANO} ausências por ano. Ultrapassado o limite, a conta poderá ser inativada.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de validação profissional</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-1">Endereço profissional</p>
              <p className="text-base font-bold text-foreground">
                {medico.endereco_profissional ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-1">Tempo de atuação</p>
              <p className="text-base font-bold text-foreground">
                {medico.tempo_atuacao_anos != null ? `+${medico.tempo_atuacao_anos} anos` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {documentos.length === 0 ? (
            <p className="text-muted-foreground italic col-span-3">Nenhum documento enviado.</p>
          ) : (
            documentos.map((doc) => (
              <Card key={doc.id} className="rounded-[10px] bg-secondary border-none">
                <CardContent className="px-6 py-4 flex items-center justify-between">
                  <a
                    href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline truncate"
                  >
                    {doc.nome_arquivo}
                  </a>
                  <a
                    href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark shrink-0"
                    aria-label="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Histórico de repasses</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary border-none">
                <TableHead className="font-semibold text-white">Data do repasse</TableHead>
                <TableHead className="font-semibold text-white">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    Nenhum repasse registrado
                  </TableCell>
                </TableRow>
              ) : (
                repasses.map((r) => (
                  <TableRow key={r.id} className="bg-card border-b border-border/40 hover:bg-muted/30">
                    <TableCell>{formatDate(r.data_repasse)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(r.valor))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

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
            <Button
              className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full"
              onClick={handleInactivate}
            >
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

export default MedicoDetalhes;
