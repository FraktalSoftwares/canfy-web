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
import { formatCurrency } from "@/lib/utils";
import { getConsultaStatusBadge } from "@/lib/consultaStatus";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Check, MinusCircle, Pencil, X, Download, FileText, AlertTriangle,
  CloudUpload, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditableField } from "@/components/EditableField";
import { MASK_MAX_LENGTH, maskCPF, maskTelefone } from "@/lib/masks";
import { patientUpdateSchema } from "@/lib/validations";
import { getUserFriendlyError, getValidationError } from "@/lib/errorUtils";
import { usePermissions } from "@/hooks/usePermissions";

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

interface AtendimentoRow {
  id: string;
  data_consulta: string;
  status: string;
  queixa_principal: string | null;
  paciente_nome: string;
  receita_id: string | null;
  cancelada_por: string | null;
  motivo_cancelamento: string | null;
}

interface ReceitaRow {
  id: string;
  numero_receita: string;
  data_emissao: string;
  validade: string | null;
  status: string;
  paciente_nome: string;
  documento_url: string | null;
}

const DOC_LABEL: Record<string, string> = {
  rg_ou_cnh: "CNH ou RG",
  comprovante_crm_cro: "Comprovante CRM",
  certificado_prescritor: "Certificado do prescritor",
  diploma: "Diploma de formação",
  certificado_complementar: "Certificado complementar",
  comprovante_residencia: "Comprovante de residência",
  outros_documentos: "Outros documentos",
};

const DOC_OPTIONAL: Record<string, boolean> = {
  certificado_complementar: true,
  outros_documentos: true,
};

const DOC_ORDER: Array<keyof typeof DOC_LABEL> = [
  "rg_ou_cnh",
  "comprovante_crm_cro",
  "certificado_prescritor",
  "diploma",
  "certificado_complementar",
  "outros_documentos",
];

const labelDocumento = (t: string) => DOC_LABEL[t] ?? t.replace(/_/g, " ");

const MAX_UPLOAD_MB = 10;
const ACCEPTED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

const STATUS_RECEITA_LABEL: Record<string, string> = {
  ativa: "Ativa",
  utilizada: "Utilizada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

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
  const { podeEditar } = usePermissions();
  const podeEditarUsuarios = podeEditar("usuarios");

  const [medico, setMedico] = useState<MedicoData | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([]);
  const [repasses, setRepasses] = useState<RepasseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  const [showAtendimentosModal, setShowAtendimentosModal] = useState(false);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);
  const [loadingAtend, setLoadingAtend] = useState(false);

  const [showReceitasModal, setShowReceitasModal] = useState(false);
  const [receitas, setReceitas] = useState<ReceitaRow[]>([]);
  const [loadingReceitas, setLoadingReceitas] = useState(false);

  const [showAusenciaDialog, setShowAusenciaDialog] = useState(false);
  const [ausenciaMotivo, setAusenciaMotivo] = useState("");
  const [savingAusencia, setSavingAusencia] = useState(false);

  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

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
          // Registros antigos podem estar sem formatação — normaliza na carga.
          telefone: maskTelefone(md.telefone || ""),
          crm: md.crm || "",
          uf_crm: md.uf_crm || "",
          email: md.email || "",
          cpf: maskCPF(md.cpf || ""),
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
      // patientUpdateSchema já encapsula os formatos de CPF/telefone usados no painel.
      patientUpdateSchema.parse({
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
      });

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
      toast({
        title: "Erro ao atualizar",
        description: e?.errors ? getValidationError(e) : getUserFriendlyError(e),
        variant: "destructive",
      });
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

  const openAtendimentos = async () => {
    setShowAtendimentosModal(true);
    if (atendimentos.length === 0) {
      setLoadingAtend(true);
      try {
        const { data, error } = await supabase.rpc("admin_get_medico_atendimentos", { p_medico_id: id!, p_limit: 200 });
        if (error) throw error;
        setAtendimentos((data as AtendimentoRow[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar atendimentos", description: e.message, variant: "destructive" });
      } finally {
        setLoadingAtend(false);
      }
    }
  };

  const openReceitas = async () => {
    setShowReceitasModal(true);
    if (receitas.length === 0) {
      setLoadingReceitas(true);
      try {
        const { data, error } = await supabase.rpc("admin_get_medico_receitas", { p_medico_id: id!, p_limit: 200 });
        if (error) throw error;
        setReceitas((data as ReceitaRow[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar receitas", description: e.message, variant: "destructive" });
      } finally {
        setLoadingReceitas(false);
      }
    }
  };

  const handleRegistrarAusencia = async () => {
    if (!ausenciaMotivo.trim()) {
      toast({ title: "Informe o motivo da ausência", variant: "destructive" });
      return;
    }
    try {
      setSavingAusencia(true);
      const { error } = await supabase.rpc("admin_register_medico_ausencia", {
        p_medico_id: id!,
        p_consulta_id: null,
        p_motivo: ausenciaMotivo.trim(),
      });
      if (error) throw error;
      toast({ title: "Ausência registrada" });
      setShowAusenciaDialog(false);
      setAusenciaMotivo("");
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao registrar ausência", description: e.message, variant: "destructive" });
    } finally {
      setSavingAusencia(false);
    }
  };

  const handleUploadDoc = async (tipo: string, file: File) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo ${MAX_UPLOAD_MB}MB`, variant: "destructive" });
      return;
    }
    if (!ACCEPTED_MIMES.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Aceitos: PDF, PNG, JPG", variant: "destructive" });
      return;
    }
    try {
      setUploadingTipo(tipo);
      const ext = file.name.split(".").pop() || "bin";
      const path = `medico_docs/${id}/${tipo}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      const { error: rpcErr } = await supabase.rpc("admin_upsert_medico_documento", {
        p_medico_id: id!,
        p_tipo: tipo,
        p_nome_arquivo: file.name,
        p_arquivo_url: pub.publicUrl,
      });
      if (rpcErr) throw rpcErr;
      toast({ title: "Documento enviado" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadingTipo(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const { error } = await supabase.rpc("admin_delete_medico_documento", { p_id: docId });
      if (error) throw error;
      toast({ title: "Documento removido" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    }
  };

  const handleInactivate = async () => {
    try {
      const { error } = await supabase.rpc("admin_inativar_medico", { p_id: id! });
      if (error) throw error;
      toast({ title: "Médico inativado" });
      setShowInactivateDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao inativar", description: e.message, variant: "destructive" });
    }
  };

  const handleReativar = async () => {
    try {
      const { error } = await supabase.rpc("admin_ativar_medico", { p_id: id! });
      if (error) throw error;
      toast({ title: "Médico reativado" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao reativar", description: e.message, variant: "destructive" });
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


      <div className="px-6 py-12 max-w-[1280px] mx-auto">
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
          {podeEditarUsuarios && (!isEditing ? (
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
          ))}
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
            {podeEditarUsuarios && (
              ativo ? (
                <Button
                  variant="outline"
                  onClick={() => setShowInactivateDialog(true)}
                  className="gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <MinusCircle className="h-4 w-4" />
                  Inativar conta
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleReativar}
                  className="gap-2 rounded-full border-primary text-primary hover:bg-primary/10"
                >
                  <Check className="h-4 w-4" />
                  Reativar conta
                </Button>
              )
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="rounded-[16px] bg-secondary border-none">
            <CardContent className="px-6 py-6 space-y-4">
              <EditableField
                label="E-mail" editing={isEditing}
                value={form.email || "—"} editValue={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <EditableField
                label="Telefone" editing={isEditing}
                value={form.telefone || "—"} editValue={form.telefone}
                onChange={(v) => setForm({ ...form, telefone: v })}
                mask={maskTelefone}
                maxLength={MASK_MAX_LENGTH.telefone}
                placeholder="(00) 00000-0000"
              />
              <div className="border-b border-border/40 pb-3 last:border-b-0">
                <p className="text-xs text-muted-foreground mb-1">CRM+UF</p>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={form.crm}
                      onChange={(e) => setForm({ ...form, crm: e.target.value })}
                      className="h-9 bg-background border-border flex-1 rounded-full px-4"
                      placeholder="CRM"
                    />
                    <Input
                      value={form.uf_crm}
                      onChange={(e) => setForm({ ...form, uf_crm: e.target.value })}
                      className="h-9 bg-background border-border w-20 rounded-full px-4"
                      placeholder="UF"
                    />
                  </div>
                ) : (
                  <p className="text-base font-bold text-foreground">{form.crm}-{form.uf_crm}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[16px] bg-secondary border-none">
            <CardContent className="px-6 py-6 space-y-4">
              <Field label="Especialidade" value={medico.especialidade_nome} />
              <Field label="Nº de atendimento" value={String(medico.total_atendimentos)} />
              <div className="pb-1">
                <p className="text-xs text-muted-foreground mb-1">Último acesso</p>
                <p className="text-base font-bold text-foreground">{formatDateTime(medico.ultimo_acesso)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isEditing && (
          <Card className="rounded-[16px] bg-secondary border-none mb-8">
            <CardContent className="px-6 py-6">
              <EditableField
                label="CPF" editing={isEditing}
                value={form.cpf || "—"} editValue={form.cpf}
                onChange={(v) => setForm({ ...form, cpf: v })}
                mask={maskCPF}
                maxLength={MASK_MAX_LENGTH.cpf}
                placeholder="000.000.000-00"
              />
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de uso</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <UsageCard label="Nº de atendimento realizadas" value={medico.total_atendimentos} onClick={openAtendimentos} />
          <UsageCard label="Nº de receitas emitidas" value={medico.total_receitas} onClick={openReceitas} />
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
              Tolerância: {LIMITE_AUSENCIAS_ANO} ausências por ano. Ao ultrapassar o limite, a conta é inativada automaticamente.
            </p>
            {podeEditarUsuarios && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAusenciaDialog(true)}
                  className="gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Registrar ausência
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de validação profissional</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="rounded-[16px] bg-secondary border-none">
            <CardContent className="px-6 py-6">
              {isEditing ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Endereço profissional</p>
                  <Input
                    value={medico.endereco_profissional ?? ""}
                    readOnly
                    className="h-9 bg-background border-border rounded-full px-4"
                    placeholder="—"
                  />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Endereço profissional</p>
                  <p className="text-base font-bold text-foreground">
                    {medico.endereco_profissional ?? "—"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-[16px] bg-secondary border-none">
            <CardContent className="px-6 py-6">
              {isEditing ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Tempo de atuação</p>
                  <Input
                    value={medico.tempo_atuacao_anos != null ? `+${medico.tempo_atuacao_anos} anos` : ""}
                    readOnly
                    className="h-9 bg-background border-border rounded-full px-4"
                    placeholder="—"
                  />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Tempo de atuação</p>
                  <p className="text-base font-bold text-foreground">
                    {medico.tempo_atuacao_anos != null ? `+${medico.tempo_atuacao_anos} anos` : "—"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {DOC_ORDER.map((tipo) => {
            const doc = documentos.find((d) => d.tipo === tipo);
            return (
              <DocSlot
                key={tipo}
                tipo={tipo}
                doc={doc}
                editing={isEditing}
                uploading={uploadingTipo === tipo}
                onUpload={(f) => handleUploadDoc(tipo, f)}
                onDelete={doc ? () => handleDeleteDoc(doc.id) : undefined}
              />
            );
          })}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Histórico de repasses</h2>
        <Card className="rounded-[16px] bg-secondary border-none mb-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-table-head hover:bg-table-head border-none">
                <TableHead className="font-normal text-foreground">Data do repasse</TableHead>
                <TableHead className="font-normal text-foreground">Valor</TableHead>
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
                  <TableRow key={r.id} className="bg-secondary border-b border-border/40 hover:bg-muted/30">
                    <TableCell className="text-sm">{formatDate(r.data_repasse)}</TableCell>
                    <TableCell className="text-sm font-semibold">{formatCurrency(Number(r.valor))}</TableCell>
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
            {podeEditarUsuarios && (
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleSaveObs}
                  disabled={savingObs}
                  className="bg-primary text-white hover:bg-primary-dark rounded-full"
                >
                  {savingObs ? "Salvando..." : "Salvar observações"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Atendimentos */}
      <Dialog open={showAtendimentosModal} onOpenChange={setShowAtendimentosModal}>
        <DialogContent className="sm:max-w-[820px] max-h-[80vh] overflow-hidden p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Atendimentos realizados</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAtendimentosModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingAtend ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : atendimentos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum atendimento encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head hover:bg-table-head border-none">
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Queixa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atendimentos.map((a) => {
                    const isCancNoShow = a.status === "cancelada" && a.cancelada_por === "medico";
                    const badge = getConsultaStatusBadge(a.status);
                    return (
                      <TableRow key={a.id} className="bg-card border-b border-border/40 hover:bg-muted/30">
                        <TableCell className="text-sm">{formatDateTime(a.data_consulta)}</TableCell>
                        <TableCell className="font-medium">{a.paciente_nome}</TableCell>
                        <TableCell className="text-sm">{a.queixa_principal || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className="border-none rounded-full hover:opacity-100"
                            style={isCancNoShow
                              ? { backgroundColor: "hsl(var(--card-red))", color: "hsl(var(--destructive))" }
                              : { backgroundColor: badge.bg, color: badge.fg }}
                          >
                            {isCancNoShow ? "Ausência" : badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Receitas */}
      <Dialog open={showReceitasModal} onOpenChange={setShowReceitasModal}>
        <DialogContent className="sm:max-w-[820px] max-h-[80vh] overflow-hidden p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Receitas emitidas</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowReceitasModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingReceitas ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : receitas.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma receita emitida.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head hover:bg-table-head border-none">
                    <TableHead>Nº receita</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.map((r) => (
                    <TableRow key={r.id} className="bg-card border-b border-border/40 hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">{r.numero_receita}</TableCell>
                      <TableCell className="font-medium">{r.paciente_nome}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.data_emissao)}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.validade)}</TableCell>
                      <TableCell>
                        <Badge className="border-none rounded-full bg-card-blue text-[hsl(207_89%_35%)] hover:bg-card-blue">
                          {STATUS_RECEITA_LABEL[r.status] || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.documento_url ? (
                          <a
                            href={r.documento_url} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:text-primary-dark inline-flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" /> baixar
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Ausência */}
      <Dialog open={showAusenciaDialog} onOpenChange={(open) => { if (!open) { setShowAusenciaDialog(false); setAusenciaMotivo(""); } }}>
        <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Registrar ausência</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAusenciaDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Adiciona +1 ao contador anual de ausências. Ao ultrapassar {LIMITE_AUSENCIAS_ANO}, a conta é inativada automaticamente.
          </p>
          <div className="mt-3">
            <label className="text-sm font-semibold">Motivo</label>
            <Textarea
              value={ausenciaMotivo}
              onChange={(e) => setAusenciaMotivo(e.target.value)}
              placeholder="Descreva brevemente o motivo da ausência..."
              className="min-h-[100px] mt-1 bg-background border-border resize-none"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAusenciaDialog(false)} disabled={savingAusencia}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full"
              onClick={handleRegistrarAusencia}
              disabled={savingAusencia}
            >
              {savingAusencia ? "Salvando..." : "Confirmar"}
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
              Deseja realmente inativar esta conta? O médico perderá o acesso à plataforma e não receberá novas consultas. Você poderá reativá-lo posteriormente.
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

function DocSlot({
  tipo, doc, editing, uploading, onUpload, onDelete,
}: {
  tipo: string;
  doc?: { id: string; nome_arquivo: string; arquivo_url: string };
  editing: boolean;
  uploading: boolean;
  onUpload: (f: File) => void;
  onDelete?: () => void;
}) {
  const label = labelDocumento(tipo);
  const optional = DOC_OPTIONAL[tipo];
  const inputId = `upload-${tipo}`;

  if (!editing) {
    if (!doc) {
      return (
        <div className="rounded-[16px] bg-secondary px-4 py-8 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{label}{optional && " (opcional)"}</p>
          <p className="text-sm text-muted-foreground italic">Não enviado</p>
        </div>
      );
    }
    return (
      <div className="rounded-[16px] bg-secondary px-4 py-8 flex items-center justify-between gap-2">
        <a
          href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
          className="text-primary font-medium hover:underline truncate flex-1 min-w-0"
          title={doc.nome_arquivo}
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
      </div>
    );
  }

  return (
    <div className="rounded-[16px] bg-secondary px-4 py-6 flex flex-col gap-3">
      <div>
        <p className="font-semibold text-foreground">
          {label}
          {optional && <span className="text-sm text-muted-foreground ml-1">(opcional)</span>}
        </p>
        <p className="text-sm text-muted-foreground">Formatos aceitos: PDF, PNG, JPG</p>
      </div>

      <input
        id={inputId}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
        disabled={uploading}
      />

      {doc && !uploading ? (
        <div className="rounded-[12px] border border-border bg-background px-3 py-2 flex items-center justify-between gap-2">
          <a
            href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
            className="text-primary text-sm hover:underline truncate flex items-center gap-2 min-w-0"
            title={doc.nome_arquivo}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{doc.nome_arquivo}</span>
          </a>
          <div className="flex items-center gap-1 shrink-0">
            <label htmlFor={inputId} className="text-xs text-primary cursor-pointer hover:underline">
              Substituir
            </label>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-destructive hover:bg-destructive/10 rounded-full p-1"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = e.dataTransfer.files?.[0];
            if (f) onUpload(f);
          }}
          className={`bg-background border-[1.5px] border-dashed rounded-[18px] py-11 px-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition ${
            uploading ? "border-primary/50 opacity-60" : "border-primary hover:bg-primary/5"
          }`}
        >
          <div className="bg-card-green/40 rounded-full p-4">
            {uploading ? (
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            ) : (
              <CloudUpload className="h-7 w-7 text-primary" />
            )}
          </div>
          <p className="text-sm font-semibold text-primary text-center leading-snug">
            {uploading ? "Enviando..." : (
              <>Clique para adicionar o arquivo<br />ou arraste-o até aqui.</>
            )}
          </p>
        </label>
      )}
    </div>
  );
}

function UsageCard({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const interactive = !!onClick;
  return (
    <Card
      className={`rounded-[10px] bg-secondary border-none ${interactive ? "cursor-pointer hover:bg-secondary/70 transition" : ""}`}
      onClick={onClick}
    >
      <CardContent className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          {interactive && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}

export default MedicoDetalhes;
