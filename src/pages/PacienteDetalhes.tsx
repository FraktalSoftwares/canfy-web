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
  Pencil, X, FileText, CloudUpload, Loader2, Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditableField } from "@/components/EditableField";
import { MASK_MAX_LENGTH, maskCPF, maskTelefone } from "@/lib/masks";
import { patientUpdateSchema } from "@/lib/validations";
import { getUserFriendlyError, getValidationError } from "@/lib/errorUtils";
import { usePermissions } from "@/hooks/usePermissions";

interface PacienteData {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  rg: string | null;
  data_nascimento: string;
  endereco_completo: string;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  sexo: string | null;
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

interface ConsultaRow {
  id: string;
  data_consulta: string;
  status: string;
  queixa_principal: string | null;
  medico_nome: string | null;
  receita_id: string | null;
}

interface ReceitaRow {
  id: string;
  numero_receita: string;
  data_emissao: string;
  validade: string | null;
  status: string;
  medico_nome: string;
  documento_url: string | null;
}

interface PedidoRow {
  id: string;
  numero_pedido: string;
  data_pedido: string;
  valor_total: number;
  status: string;
  status_anvisa: string | null;
  canal_aquisicao: string | null;
}

interface ProntuarioRow {
  id: string;
  consulta_id: string | null;
  medico_nome: string | null;
  status: string;
  arquivo_url: string | null;
  created_at: string;
}

interface Anamnese {
  peso: number | null;
  altura: number | null;
  tem_alergias: boolean | null;
  alergias_detalhes: string | null;
  tem_tratamentos_anteriores: boolean | null;
  tratamentos_anteriores_detalhes: string | null;
  tem_comorbidades: boolean | null;
  comorbidades_detalhes: string | null;
  tem_medicacoes_atuais: boolean | null;
  medicacoes_atuais_detalhes: string | null;
  tem_exames_recentes: boolean | null;
  exames_recentes_detalhes: string | null;
  produtos_cannabis_utilizados: string | null;
  tem_reacoes_adversas: boolean | null;
  reacoes_adversas_detalhes: string | null;
}

const DOC_LABEL_PAC: Record<string, string> = {
  identidade: "Documento de identificação",
  comprovante_residencia: "Comprovante de residência",
  laudo_medico: "Laudo médico",
  autorizacao_anvisa: "Autorização Anvisa",
  procuracao: "Procuração assinada",
  prontuario: "Prontuário",
  exame: "Exame",
  outro: "Outros",
};
const labelDoc = (t: string) => DOC_LABEL_PAC[t] ?? t.replace(/_/g, " ");

// Slots editáveis para Documentos do usuário (Figma 2727:15100)
const USER_DOC_SLOTS: Array<{ tipo: string; label: string }> = [
  { tipo: "identidade", label: "Documento de identificação" },
  { tipo: "comprovante_residencia", label: "Comprovante de residência" },
];

const MAX_UPLOAD_MB = 10;
const ACCEPTED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

const STATUS_CONSULTA: Record<string, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};
const STATUS_RECEITA: Record<string, string> = {
  ativa: "Ativa",
  utilizada: "Utilizada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};
const STATUS_PEDIDO: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_analise: "Em análise",
  recusado: "Recusado",
  cancelado: "Cancelado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
};

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
  const { podeEditar } = usePermissions();
  const podeEditarUsuarios = podeEditar("usuarios");

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
    rg: "",
    dataNascimento: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    sexo: "",
  });

  const [showConsultasModal, setShowConsultasModal] = useState(false);
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);

  const [showReceitasModal, setShowReceitasModal] = useState(false);
  const [receitas, setReceitas] = useState<ReceitaRow[]>([]);
  const [loadingReceitas, setLoadingReceitas] = useState(false);

  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  const [prontuarios, setProntuarios] = useState<ProntuarioRow[]>([]);

  const [anamnese, setAnamnese] = useState<Anamnese>({
    peso: null, altura: null,
    tem_alergias: null, alergias_detalhes: null,
    tem_tratamentos_anteriores: null, tratamentos_anteriores_detalhes: null,
    tem_comorbidades: null, comorbidades_detalhes: null,
    tem_medicacoes_atuais: null, medicacoes_atuais_detalhes: null,
    tem_exames_recentes: null, exames_recentes_detalhes: null,
    produtos_cannabis_utilizados: null,
    tem_reacoes_adversas: null, reacoes_adversas_detalhes: null,
  });
  const [savingAnamnese, setSavingAnamnese] = useState(false);

  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [{ data: pacData, error: pacErr }, { data: pagData }, { data: docData }, { data: anaData }, { data: prontData }] =
        await Promise.all([
          supabase.rpc("admin_get_paciente", { p_id: id! }),
          supabase.rpc("admin_get_paciente_pagamentos", { p_paciente_id: id! }),
          supabase.rpc("admin_get_paciente_documentos", { p_paciente_id: id! }),
          supabase.rpc("admin_get_paciente_anamnese", { p_paciente_id: id! }),
          supabase.rpc("admin_get_paciente_prontuarios", { p_paciente_id: id! }),
        ]);

      if (pacErr) throw pacErr;
      if (pacData && pacData.length > 0) {
        const p = pacData[0] as PacienteData;
        setPaciente(p);
        setForm({
          // Registros antigos podem estar sem formatação — normaliza na carga
          // para que a validação no salvar não rejeite dados não editados.
          telefone: maskTelefone(p.telefone || ""),
          cpf: maskCPF(p.cpf || ""),
          rg: p.rg || "",
          dataNascimento: p.data_nascimento || "",
          endereco_logradouro: p.endereco_logradouro || "",
          endereco_numero: p.endereco_numero || "",
          endereco_complemento: p.endereco_complemento || "",
          bairro: p.bairro || "",
          cidade: p.cidade || "",
          estado: p.estado || "",
          cep: p.cep || "",
          sexo: p.sexo || "",
        });
        setObservacoes(p.observacoes_admin || "");
      }
      setPagamentos((pagData as PagamentoRow[]) || []);
      setDocumentos((docData as DocumentoRow[]) || []);
      if (anaData && (anaData as Anamnese[]).length > 0) {
        setAnamnese((anaData as Anamnese[])[0]);
      }
      setProntuarios((prontData as ProntuarioRow[]) || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar paciente", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openConsultas = async () => {
    setShowConsultasModal(true);
    if (consultas.length === 0) {
      setLoadingConsultas(true);
      try {
        const { data, error } = await supabase.rpc("admin_get_paciente_consultas", { p_paciente_id: id!, p_limit: 200 });
        if (error) throw error;
        setConsultas((data as ConsultaRow[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar consultas", description: e.message, variant: "destructive" });
      } finally {
        setLoadingConsultas(false);
      }
    }
  };

  const openReceitas = async () => {
    setShowReceitasModal(true);
    if (receitas.length === 0) {
      setLoadingReceitas(true);
      try {
        const { data, error } = await supabase.rpc("admin_get_paciente_receitas", { p_paciente_id: id!, p_limit: 200 });
        if (error) throw error;
        setReceitas((data as ReceitaRow[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar receitas", description: e.message, variant: "destructive" });
      } finally {
        setLoadingReceitas(false);
      }
    }
  };

  const openPedidos = async () => {
    setShowPedidosModal(true);
    if (pedidos.length === 0) {
      setLoadingPedidos(true);
      try {
        const { data, error } = await supabase.rpc("admin_get_paciente_pedidos", { p_paciente_id: id!, p_limit: 200 });
        if (error) throw error;
        setPedidos((data as PedidoRow[]) || []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar pedidos", description: e.message, variant: "destructive" });
      } finally {
        setLoadingPedidos(false);
      }
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
      const path = `paciente_docs/${id}/${tipo}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      const { error: rpcErr } = await supabase.rpc("admin_upsert_paciente_documento", {
        p_paciente_id: id!,
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
      const { error } = await supabase.rpc("admin_delete_paciente_documento", { p_id: docId });
      if (error) throw error;
      toast({ title: "Documento removido" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveAnamnese = async () => {
    try {
      setSavingAnamnese(true);
      const { error } = await supabase.rpc("admin_upsert_paciente_anamnese", {
        p_paciente_id: id!,
        p_peso: anamnese.peso,
        p_altura: anamnese.altura,
        p_tem_alergias: anamnese.tem_alergias,
        p_alergias_detalhes: anamnese.alergias_detalhes,
        p_tem_tratamentos_anteriores: anamnese.tem_tratamentos_anteriores,
        p_tratamentos_anteriores_detalhes: anamnese.tratamentos_anteriores_detalhes,
        p_tem_comorbidades: anamnese.tem_comorbidades,
        p_comorbidades_detalhes: anamnese.comorbidades_detalhes,
        p_tem_medicacoes_atuais: anamnese.tem_medicacoes_atuais,
        p_medicacoes_atuais_detalhes: anamnese.medicacoes_atuais_detalhes,
        p_tem_exames_recentes: anamnese.tem_exames_recentes,
        p_exames_recentes_detalhes: anamnese.exames_recentes_detalhes,
        p_produtos_cannabis_utilizados: anamnese.produtos_cannabis_utilizados,
        p_tem_reacoes_adversas: anamnese.tem_reacoes_adversas,
        p_reacoes_adversas_detalhes: anamnese.reacoes_adversas_detalhes,
      });
      if (error) throw error;
      toast({ title: "Anamnese salva" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar anamnese", description: e.message, variant: "destructive" });
    } finally {
      setSavingAnamnese(false);
    }
  };

  const handleSave = async () => {
    try {
      // Valida os campos mascarados antes de gravar — os schemas exigem o valor
      // já formatado, que é o que as máscaras produzem.
      patientUpdateSchema.parse({
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
        data_nascimento: form.dataNascimento || undefined,
      });

      const { error } = await supabase.rpc("admin_update_paciente", {
        p_id: id!,
        p_telefone: form.telefone || null,
        p_cpf: form.cpf || null,
        p_rg: form.rg || null,
        p_data_nascimento: form.dataNascimento || null,
        p_endereco_logradouro: form.endereco_logradouro || null,
        p_endereco_numero: form.endereco_numero || null,
        p_endereco_complemento: form.endereco_complemento || null,
        p_bairro: form.bairro || null,
        p_cidade: form.cidade || null,
        p_estado: form.estado || null,
        p_cep: form.cep || null,
        p_sexo: form.sexo || null,
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
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao inativar", description: e.message, variant: "destructive" });
    }
  };

  const handleReativar = async () => {
    try {
      const { error } = await supabase.rpc("admin_ativar_paciente", { p_id: id! });
      if (error) throw error;
      toast({ title: "Paciente reativado" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao reativar", description: e.message, variant: "destructive" });
    }
  };

  const anvisaCampos = useMemo(() => {
    if (!paciente) return [] as { label: string; value: string }[];
    const enderecoCompleto = [
      paciente.endereco_logradouro || paciente.endereco_completo,
      paciente.endereco_numero,
      paciente.endereco_complemento,
      paciente.bairro,
    ].filter(Boolean).join(", ");
    return [
      { label: "Nome completo", value: paciente.nome_completo || "" },
      { label: "Sexo", value: paciente.sexo || paciente.genero || "" },
      { label: "Data de nascimento", value: formatDate(paciente.data_nascimento) || "" },
      { label: "Nº do documento (RG)", value: paciente.rg || "" },
      { label: "CPF", value: paciente.cpf || "" },
      { label: "Endereço", value: enderecoCompleto || "" },
      { label: "Estado", value: paciente.estado || "" },
      { label: "Município", value: paciente.cidade || "" },
      { label: "CEP", value: paciente.cep || "" },
      { label: "Celular", value: paciente.telefone || "" },
      { label: "E-mail", value: paciente.email || "" },
    ];
  }, [paciente]);

  const anvisaTexto = useMemo(
    () => anvisaCampos.map((c) => `${c.label}: ${c.value || "—"}`).join("\n"),
    [anvisaCampos]
  );

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
    }
  };

  const handleCopyAnvisa = () => copy(anvisaTexto, "Dados");

  const docsUsuario = documentos.filter((d) => d.categoria === "usuario");
  const docsProduto = documentos.filter((d) => d.categoria === "produto");

  const groupDocs = (docs: DocumentoRow[]) => {
    const map: Record<string, DocumentoRow[]> = {};
    docs.forEach((d) => {
      (map[d.tipo] ||= []).push(d);
    });
    return Object.entries(map);
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
            {podeEditarUsuarios && (!isEditing ? (
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
            ))}
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
            {podeEditarUsuarios && (
              paciente.ativo ? (
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
              <Field label="E-mail" value={paciente.email} />
              <EditableField
                label="Telefone"
                value={form.telefone || "—"}
                editing={isEditing}
                onChange={(v) => setForm({ ...form, telefone: v })}
                editValue={form.telefone}
                mask={maskTelefone}
                maxLength={MASK_MAX_LENGTH.telefone}
                placeholder="(00) 00000-0000"
              />
              <EditableField
                label="CPF"
                value={form.cpf || "—"}
                editing={isEditing}
                onChange={(v) => setForm({ ...form, cpf: v })}
                editValue={form.cpf}
                mask={maskCPF}
                maxLength={MASK_MAX_LENGTH.cpf}
                placeholder="000.000.000-00"
              />
            </CardContent>
          </Card>
          <Card className="rounded-[16px] bg-secondary border-none">
            <CardContent className="px-6 py-6 space-y-4">
              <EditableField
                label="Gênero"
                value={form.sexo || "—"}
                editing={isEditing}
                onChange={(v) => setForm({ ...form, sexo: v })}
                editValue={form.sexo}
              />
              <EditableField
                label="Data de nascimento"
                value={formatDate(form.dataNascimento) || "—"}
                editing={isEditing}
                onChange={(v) => setForm({ ...form, dataNascimento: v })}
                editValue={form.dataNascimento}
                type="date"
              />
              <div className="pb-1">
                <p className={`text-xs mb-1 ${isEditing ? "text-foreground font-semibold" : "text-muted-foreground"}`}>Região</p>
                {isEditing ? (
                  <Input
                    value={form.endereco_logradouro}
                    onChange={(e) => setForm({ ...form, endereco_logradouro: e.target.value })}
                    placeholder="Rua, número, cidade/UF — Bairro"
                    className="h-9 bg-background border-border rounded-full px-4"
                  />
                ) : (
                  <p className="text-base font-bold text-foreground break-words">
                    {[
                      form.endereco_logradouro || paciente.endereco_completo,
                      form.endereco_numero && `nº ${form.endereco_numero}`,
                      form.cidade && form.estado ? `${form.cidade}/${form.estado}` : form.cidade,
                      form.bairro,
                    ].filter(Boolean).join(", ") || "—"}
                  </p>
                )}
              </div>
              {isEditing && (
                <EditableField
                  label="RG"
                  value={form.rg || "—"}
                  editing={isEditing}
                  onChange={(v) => setForm({ ...form, rg: v })}
                  editValue={form.rg}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Endereço</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="grid grid-cols-3 gap-x-6 gap-y-5 px-6 py-6">
            <EditableField label="CEP" value={form.cep || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, cep: v })} editValue={form.cep} />
            <EditableField label="Estado" value={form.estado || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, estado: v })} editValue={form.estado} />
            <EditableField label="Município" value={form.cidade || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, cidade: v })} editValue={form.cidade} />
            <EditableField label="Bairro" value={form.bairro || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, bairro: v })} editValue={form.bairro} />
            <div className="col-span-2">
              <EditableField label="Logradouro" value={form.endereco_logradouro || paciente.endereco_completo || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, endereco_logradouro: v })} editValue={form.endereco_logradouro} />
            </div>
            <EditableField label="Número" value={form.endereco_numero || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, endereco_numero: v })} editValue={form.endereco_numero} />
            <div className="col-span-2">
              <EditableField label="Complemento" value={form.endereco_complemento || "—"} editing={isEditing} onChange={(v) => setForm({ ...form, endereco_complemento: v })} editValue={form.endereco_complemento} />
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Dados de uso</h2>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <UsageCard label="Nº de consultas realizadas" value={paciente.total_consultas} onClick={openConsultas} />
          <UsageCard label="Nº de receitas emitidas" value={paciente.total_receitas} onClick={openReceitas} />
          <UsageCard label="Nº de pedidos realizados" value={paciente.total_pedidos} onClick={openPedidos} />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">Histórico de pagamentos</h2>
        <Card className="rounded-[16px] bg-secondary border-none mb-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-table-head hover:bg-table-head border-none">
                <TableHead className="font-normal text-foreground">Data do pagamento</TableHead>
                <TableHead className="font-normal text-foreground">Tipo</TableHead>
                <TableHead className="font-normal text-foreground">Valor</TableHead>
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
                  <TableRow key={i} className="bg-secondary border-b border-border/40 hover:bg-muted/30">
                    <TableCell className="text-sm">{formatDate(p.data_pagamento)}</TableCell>
                    <TableCell className="text-sm">{p.tipo}</TableCell>
                    <TableCell className="text-sm font-semibold">{formatCurrency(Number(p.valor))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Documentos do usuário</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {USER_DOC_SLOTS.map((slot) => {
            const doc = docsUsuario.find((d) => d.tipo === slot.tipo);
            return (
              <DocSlot
                key={slot.tipo}
                tipo={slot.tipo}
                label={slot.label}
                doc={doc}
                editing={isEditing}
                uploading={uploadingTipo === slot.tipo}
                onUpload={(f) => handleUploadDoc(slot.tipo, f)}
                onDelete={doc ? () => handleDeleteDoc(doc.id) : undefined}
              />
            );
          })}
          {/* Docs extras de usuário fora dos slots canônicos */}
          {docsUsuario
            .filter((d) => !USER_DOC_SLOTS.some((s) => s.tipo === d.tipo))
            .map((doc) => (
              <Card key={doc.id} className="rounded-[16px] bg-secondary border-none">
                <CardContent className="px-6 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                       className="text-primary font-medium hover:underline truncate">
                      {doc.nome_arquivo}
                    </a>
                  </div>
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                     className="text-primary hover:text-primary-dark shrink-0 ml-3" aria-label="Baixar">
                    <Download className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            ))}
        </div>

        {!isEditing && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4">Documentos por pedido</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {docsProduto.length === 0 ? (
                <p className="text-muted-foreground italic col-span-2">Nenhum documento de pedido.</p>
              ) : (
                docsProduto.map((doc) => (
                  <Card key={doc.id} className="rounded-[16px] bg-secondary border-none">
                    <CardContent className="px-6 py-6 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                           className="text-primary font-medium hover:underline truncate" title={doc.nome_arquivo}>
                          {doc.nome_arquivo}
                        </a>
                      </div>
                      <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                         className="text-primary hover:text-primary-dark shrink-0" aria-label="Baixar">
                        <Download className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        <h2 className="text-xl font-bold text-foreground mb-4">Prontuários</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary border-none">
                <TableHead className="font-semibold text-white">Data</TableHead>
                <TableHead className="font-semibold text-white">Médico</TableHead>
                <TableHead className="font-semibold text-white">Status</TableHead>
                <TableHead className="font-semibold text-white text-right">Arquivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prontuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum prontuário gerado
                  </TableCell>
                </TableRow>
              ) : (
                prontuarios.map((pr) => (
                  <TableRow key={pr.id} className="bg-card border-b border-border/40 hover:bg-muted/30">
                    <TableCell>{formatDate(pr.created_at)}</TableCell>
                    <TableCell>{pr.medico_nome || "—"}</TableCell>
                    <TableCell>
                      <Badge className="border-none rounded-full bg-card-blue text-[hsl(207_89%_35%)] hover:bg-card-blue">
                        {pr.status === "finalizado" ? "Finalizado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pr.arquivo_url ? (
                        <a href={pr.arquivo_url} target="_blank" rel="noopener noreferrer"
                           className="text-primary hover:text-primary-dark inline-flex items-center gap-1">
                          <Download className="h-4 w-4" /> baixar
                        </a>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Anamnese / Histórico clínico</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-muted-foreground">Peso (kg)</label>
                <Input
                  type="number" step="0.1"
                  value={anamnese.peso ?? ""}
                  onChange={(e) => setAnamnese({ ...anamnese, peso: e.target.value === "" ? null : parseFloat(e.target.value) })}
                  className="h-9 bg-background border-border mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Altura (m)</label>
                <Input
                  type="number" step="0.01"
                  value={anamnese.altura ?? ""}
                  onChange={(e) => setAnamnese({ ...anamnese, altura: e.target.value === "" ? null : parseFloat(e.target.value) })}
                  className="h-9 bg-background border-border mt-1"
                />
              </div>
            </div>
            <AnamneseYesNo
              label="Possui alergias?"
              flag={anamnese.tem_alergias}
              detail={anamnese.alergias_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_alergias: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, alergias_detalhes: v })}
            />
            <AnamneseYesNo
              label="Já realizou tratamentos anteriores?"
              flag={anamnese.tem_tratamentos_anteriores}
              detail={anamnese.tratamentos_anteriores_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_tratamentos_anteriores: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, tratamentos_anteriores_detalhes: v })}
            />
            <AnamneseYesNo
              label="Possui comorbidades?"
              flag={anamnese.tem_comorbidades}
              detail={anamnese.comorbidades_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_comorbidades: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, comorbidades_detalhes: v })}
            />
            <AnamneseYesNo
              label="Faz uso de medicações atualmente?"
              flag={anamnese.tem_medicacoes_atuais}
              detail={anamnese.medicacoes_atuais_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_medicacoes_atuais: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, medicacoes_atuais_detalhes: v })}
            />
            <AnamneseYesNo
              label="Possui exames recentes?"
              flag={anamnese.tem_exames_recentes}
              detail={anamnese.exames_recentes_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_exames_recentes: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, exames_recentes_detalhes: v })}
            />
            <div>
              <label className="text-xs text-muted-foreground">Produtos de cannabis já utilizados</label>
              <Textarea
                value={anamnese.produtos_cannabis_utilizados ?? ""}
                onChange={(e) => setAnamnese({ ...anamnese, produtos_cannabis_utilizados: e.target.value || null })}
                placeholder="Liste produtos de cannabis já utilizados pelo paciente..."
                className="min-h-[80px] mt-1 bg-background border-border resize-none"
              />
            </div>
            <AnamneseYesNo
              label="Já apresentou reações adversas?"
              flag={anamnese.tem_reacoes_adversas}
              detail={anamnese.reacoes_adversas_detalhes}
              onFlag={(v) => setAnamnese({ ...anamnese, tem_reacoes_adversas: v })}
              onDetail={(v) => setAnamnese({ ...anamnese, reacoes_adversas_detalhes: v })}
            />
            {podeEditarUsuarios && (
              <div className="flex justify-end">
                <Button onClick={handleSaveAnamnese} disabled={savingAnamnese} className="bg-primary text-white hover:bg-primary-dark rounded-full">
                  {savingAnamnese ? "Salvando..." : "Salvar anamnese"}
                </Button>
              </div>
            )}
          </CardContent>
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

      <Dialog open={showAnvisaDialog} onOpenChange={setShowAnvisaDialog}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-hidden p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Dados para solicitação Anvisa</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAnvisaDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Copie cada campo individualmente para colar no portal gov.br ou copie tudo de uma vez.
          </p>
          <div className="space-y-2 overflow-y-auto max-h-[55vh]">
            {anvisaCampos.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3 bg-card-green/40 rounded-[10px] px-4 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{c.value || "—"}</p>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary"
                  onClick={() => copy(c.value || "", c.label)}
                  disabled={!c.value}
                  aria-label={`Copiar ${c.label}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAnvisaDialog(false)}>
              Fechar
            </Button>
            <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full gap-2" onClick={handleCopyAnvisa}>
              <Copy className="h-4 w-4" />
              Copiar tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Consultas */}
      <Dialog open={showConsultasModal} onOpenChange={setShowConsultasModal}>
        <DialogContent className="sm:max-w-[820px] max-h-[80vh] overflow-hidden p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Consultas realizadas</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowConsultasModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingConsultas ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : consultas.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma consulta encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head hover:bg-table-head border-none">
                    <TableHead>Data</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Queixa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((c) => (
                    <TableRow key={c.id} className="bg-card border-b border-border/40 hover:bg-muted/30">
                      <TableCell className="text-sm">{formatDate(c.data_consulta)}</TableCell>
                      <TableCell className="font-medium">{c.medico_nome || "—"}</TableCell>
                      <TableCell className="text-sm">{c.queixa_principal || "—"}</TableCell>
                      <TableCell>
                        <Badge className="border-none rounded-full bg-card-blue text-[hsl(207_89%_35%)] hover:bg-card-blue">
                          {STATUS_CONSULTA[c.status] || c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
                    <TableHead>Nº</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.map((r) => (
                    <TableRow
                      key={r.id}
                      className="bg-card border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/receitas/${r.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{r.numero_receita}</TableCell>
                      <TableCell>{r.medico_nome}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.data_emissao)}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.validade)}</TableCell>
                      <TableCell>
                        <Badge className="border-none rounded-full bg-card-blue text-[hsl(207_89%_35%)] hover:bg-card-blue">
                          {STATUS_RECEITA[r.status] || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {r.documento_url ? (
                          <a href={r.documento_url} target="_blank" rel="noopener noreferrer"
                             className="text-primary hover:text-primary-dark inline-flex items-center gap-1">
                            <Download className="h-4 w-4" /> baixar
                          </a>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pedidos */}
      <Dialog open={showPedidosModal} onOpenChange={setShowPedidosModal}>
        <DialogContent className="sm:max-w-[820px] max-h-[80vh] overflow-hidden p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Pedidos realizados</DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPedidosModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingPedidos ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : pedidos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-head hover:bg-table-head border-none">
                    <TableHead>Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anvisa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => (
                    <TableRow
                      key={p.id}
                      className="bg-card border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/pedidos/${p.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{p.numero_pedido}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.data_pedido)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(p.valor_total))}</TableCell>
                      <TableCell className="text-sm capitalize">{p.canal_aquisicao || "—"}</TableCell>
                      <TableCell>
                        <Badge className="border-none rounded-full bg-card-blue text-[hsl(207_89%_35%)] hover:bg-card-blue">
                          {STATUS_PEDIDO[p.status] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.status_anvisa || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
              Deseja realmente inativar esta conta? O paciente perderá o acesso à plataforma. Você poderá reativá-lo posteriormente.
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

function DocSlot({
  tipo, label, doc, editing, uploading, onUpload, onDelete,
}: {
  tipo: string;
  label: string;
  doc?: DocumentoRow;
  editing: boolean;
  uploading: boolean;
  onUpload: (f: File) => void;
  onDelete?: () => void;
}) {
  const inputId = `pac-upload-${tipo}`;

  if (!editing) {
    if (!doc) {
      return (
        <div className="rounded-[16px] bg-secondary px-6 py-6 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm text-muted-foreground italic">Não enviado</p>
        </div>
      );
    }
    return (
      <Card className="rounded-[16px] bg-secondary border-none">
        <CardContent className="px-6 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
               className="text-primary font-medium hover:underline truncate" title={doc.nome_arquivo}>
              {doc.nome_arquivo}
            </a>
          </div>
          <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
             className="text-primary hover:text-primary-dark shrink-0" aria-label="Baixar">
            <Download className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-[16px] bg-secondary px-4 py-6 flex flex-col gap-3">
      <div>
        <p className="font-semibold text-foreground">{label}</p>
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

function DocLink({ doc }: { doc: DocumentoRow }) {
  return (
    <div className="flex items-center justify-between">
      <a
        href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
        className="text-primary font-medium hover:underline truncate flex items-center gap-2"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">{doc.nome_arquivo}</span>
      </a>
      <a
        href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
        className="text-primary hover:text-primary-dark shrink-0 ml-3"
        aria-label="Baixar"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

function AnamneseYesNo({
  label, flag, detail, onFlag, onDetail,
}: {
  label: string;
  flag: boolean | null;
  detail: string | null;
  onFlag: (v: boolean) => void;
  onDetail: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{flag ? "Sim" : "Não"}</span>
          <Switch checked={!!flag} onCheckedChange={(v) => onFlag(v)} />
        </div>
      </div>
      {flag && (
        <Textarea
          value={detail ?? ""}
          onChange={(e) => onDetail(e.target.value || null)}
          placeholder="Detalhes..."
          className="min-h-[70px] mt-2 bg-background border-border resize-none"
        />
      )}
    </div>
  );
}

export default PacienteDetalhes;
