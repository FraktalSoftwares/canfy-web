import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Check, Copy, Download, X, ShieldCheck, ShieldX,
  Truck, Package, AlertCircle, UploadCloud, FileText, RefreshCw, Trash2, Pill,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getStatusBadge, timelineStageIndex, TIMELINE_STAGES, isPedidoReprovado,
} from "@/lib/pedidoStatus";
import { formatCurrency } from "@/lib/utils";

type AnvisaStatus = "nao_solicitado" | "em_analise" | "aprovado" | "recusado";

const MAX_UPLOAD_MB = 10;
const ACCEPTED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

interface DocumentoRow {
  id: string;
  tipo: string;
  nome_arquivo: string;
  arquivo_url: string;
}

interface HistoricoRow {
  status_anterior: string | null;
  status_novo: string;
  observacao: string | null;
  created_at: string;
}

interface ProdutoPedido {
  item_id: string;
  produto_id: string;
  produto_nome: string;
  imagem_url: string | null;
  fornecedor_tipo: string | null;
  fornecedor_nome: string | null;
  forma_farmaceutica: string | null;
  concentracao_thc: string | null;
  concentracao_cbd: string | null;
  posologia: string | null;
  tipo_origem: string | null;
  quantidade: number;
}

interface PedidoDetalhes {
  id: string;
  numero_pedido: string;
  status: string;
  status_anvisa: AnvisaStatus;
  valor_total: number | null;
  canal_aquisicao: string;
  data_pedido: string;
  codigo_rastreio: string | null;
  rastreio_atualizado_em: string | null;
  prazo_entrega_inicio: string | null;
  prazo_entrega_fim: string | null;
  receita_id: string | null;
  numero_receita: string | null;
  data_emissao: string | null;
  paciente_id: string;
  paciente_nome: string;
  medico_nome: string | null;
  documentos: DocumentoRow[] | null;
  historico: HistoricoRow[] | null;
}

interface PedidoMeFields {
  melhor_envio_servico_id: number | null;
  melhor_envio_order_id: string | null;
  melhor_envio_etiqueta_url: string | null;
  frete_valor: number | null;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy • HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
};

const formatTimeline = (d: string | null) => {
  if (!d) return "00/00/0000, às 00h00";
  try {
    return format(new Date(d), "dd/MM/yyyy', às' HH'h'mm", { locale: ptBR });
  } catch {
    return "00/00/0000, às 00h00";
  }
};

const FORMA_LABEL: Record<string, string> = {
  oleo: "Óleo", capsula: "Cápsula", spray: "Spray", gel: "Gel", creme: "Creme", outro: "Outro",
};

const PedidoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pedido, setPedido] = useState<PedidoDetalhes | null>(null);
  const [produtos, setProdutos] = useState<ProdutoPedido[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAprovar, setShowAprovar] = useState(false);
  const [showRecusar, setShowRecusar] = useState(false);
  const [showEntrega, setShowEntrega] = useState(false);
  const [obsAprovar, setObsAprovar] = useState("");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [entregaStatus, setEntregaStatus] = useState<"em_separacao" | "enviado" | "entregue">("em_separacao");
  const [entregaRastreio, setEntregaRastreio] = useState("");
  const [entregaInicio, setEntregaInicio] = useState("");
  const [entregaFim, setEntregaFim] = useState("");
  const [entregaObs, setEntregaObs] = useState("");
  const [acting, setActing] = useState(false);

  // Fluxo Autorização Anvisa
  const [showAnvisa, setShowAnvisa] = useState(false);
  const [anvisaDecisao, setAnvisaDecisao] = useState<"aprovada" | "negada" | null>(null);
  const [anvisaFile, setAnvisaFile] = useState<File | null>(null);
  const [anvisaSaving, setAnvisaSaving] = useState(false);
  const [showAnvisaFeedback, setShowAnvisaFeedback] = useState(false);
  const anvisaInputRef = useRef<HTMLInputElement>(null);

  const [meFields, setMeFields] = useState<PedidoMeFields | null>(null);
  const [showEtiqueta, setShowEtiqueta] = useState(false);
  const [etiquetaLoading, setEtiquetaLoading] = useState(false);
  const [destNome, setDestNome] = useState("");
  const [destDoc, setDestDoc] = useState("");
  const [destEmail, setDestEmail] = useState("");
  const [destPhone, setDestPhone] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [destNumber, setDestNumber] = useState("");
  const [destComplement, setDestComplement] = useState("");
  const [destDistrict, setDestDistrict] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destState, setDestState] = useState("");
  const [destCep, setDestCep] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPedido = async () => {
    try {
      setLoading(true);
      const [{ data, error }, meRes, prodRes] = await Promise.all([
        supabase.rpc("admin_get_pedido_detalhes", { p_id: id! }),
        supabase
          .from("pedidos")
          .select("melhor_envio_servico_id, melhor_envio_order_id, melhor_envio_etiqueta_url, frete_valor")
          .eq("id", id!)
          .maybeSingle(),
        supabase.rpc("admin_get_pedido_produtos", { p_pedido_id: id! }),
      ]);
      if (error) throw error;
      if (data && data.length > 0) setPedido(data[0] as unknown as PedidoDetalhes);
      if (meRes.data) setMeFields(meRes.data as PedidoMeFields);
      if (prodRes.data) setProdutos(prodRes.data as ProdutoPedido[]);
    } catch (e: any) {
      toast({ title: "Erro ao carregar pedido", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEtiquetaDialog = async () => {
    if (!pedido) return;
    setDestNome(pedido.paciente_nome ?? "");
    setDestDoc(""); setDestEmail(""); setDestPhone("");
    setDestAddress(""); setDestNumber(""); setDestComplement("");
    setDestDistrict(""); setDestCity(""); setDestState(""); setDestCep("");
    try {
      const { data } = await supabase
        .from("pacientes")
        .select("cpf, profiles(telefone)")
        .eq("id", pedido.paciente_id)
        .maybeSingle();
      if (data) {
        setDestDoc((data as any).cpf ?? "");
        const profile = (data as any).profiles;
        if (profile?.telefone) setDestPhone(profile.telefone);
      }
    } catch {
      // admin preenche manual
    }
    setShowEtiqueta(true);
  };

  const handleGerarEtiqueta = async () => {
    if (!pedido) return;
    if (!destNome.trim() || !destDoc.trim() || !destAddress.trim() ||
        !destNumber.trim() || !destDistrict.trim() || !destCity.trim() ||
        !destState.trim() || !destCep.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setEtiquetaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("melhor-envio-checkout", {
        body: {
          pedido_id: pedido.id,
          destinatario: {
            nome: destNome.trim(),
            document: destDoc.replace(/\D/g, ""),
            email: destEmail.trim(),
            phone: destPhone.replace(/\D/g, ""),
            address: destAddress.trim(),
            number: destNumber.trim(),
            complement: destComplement.trim() || undefined,
            district: destDistrict.trim(),
            city: destCity.trim(),
            state_abbr: destState.trim().toUpperCase(),
            postal_code: destCep.replace(/\D/g, ""),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast({
          title: "Erro ao gerar etiqueta",
          description: JSON.stringify((data as any).detail ?? (data as any).error),
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Etiqueta gerada", description: `Order ID: ${(data as any).order_id}` });
      setShowEtiqueta(false);
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setEtiquetaLoading(false);
    }
  };

  const currentStage = useMemo(
    () => (pedido ? timelineStageIndex(pedido.status) : -1),
    [pedido]
  );

  // Mapeia, para cada etapa da timeline, a data do histórico correspondente.
  const stageDate = useMemo(() => {
    const h = pedido?.historico ?? [];
    const find = (statuses: string[]) =>
      h.find((x) => statuses.includes(x.status_novo))?.created_at ?? null;
    return [
      pedido?.data_pedido ?? null,
      find(["aprovado", "recusado", "cancelado"]),
      find(["em_analise", "em_separacao"]),
      find(["enviado"]),
      find(["entregue"]),
    ];
  }, [pedido]);

  const reprovado = pedido ? isPedidoReprovado(pedido.status) : false;

  const stageLabel = (i: number) =>
    i === 1 && reprovado ? "Pedido reprovado pela equipe Canfy" : TIMELINE_STAGES[i];

  const prazoLabel = useMemo(() => {
    if (!pedido?.prazo_entrega_inicio || !pedido?.prazo_entrega_fim) {
      return "Prazo de entrega não definido";
    }
    const ini = new Date(pedido.prazo_entrega_inicio);
    const fim = new Date(pedido.prazo_entrega_fim);
    const sameMonth = ini.getMonth() === fim.getMonth();
    if (sameMonth) {
      return `Chega entre ${ini.getDate()} e ${format(fim, "d 'de' MMMM", { locale: ptBR })}`;
    }
    return `Chega entre ${format(ini, "d 'de' MMM", { locale: ptBR })} e ${format(fim, "d 'de' MMM", { locale: ptBR })}`;
  }, [pedido]);

  /** Reembolsa (ou cancela, se pendente) o pagamento Asaas vinculado ao pedido.
   * Falha silenciosa: a recusa do pedido já foi confirmada antes desta chamada. */
  const reembolsarPagamentoDoPedido = async (pedidoId: string) => {
    try {
      const { data } = await supabase
        .from("asaas_payments")
        .select("asaas_payment_id")
        .eq("reference_type", "order")
        .eq("reference_id", pedidoId)
        .maybeSingle();
      const asaasPaymentId = data?.asaas_payment_id;
      if (!asaasPaymentId) return;
      await supabase.functions.invoke("asaas-refund-payment", {
        body: { asaas_payment_id: asaasPaymentId },
      });
    } catch {
      // não bloqueante
    }
  };

  const handleAprovar = async () => {
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_aprovar_pedido", {
        p_id: pedido!.id,
        p_observacao: obsAprovar || null,
      });
      if (error) throw error;
      toast({ title: "Pedido aprovado" });
      setShowAprovar(false);
      setObsAprovar("");
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleRecusar = async () => {
    if (!motivoRecusa.trim()) {
      toast({ title: "Informe a justificativa da recusa", variant: "destructive" });
      return;
    }
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_recusar_pedido", {
        p_id: pedido!.id,
        p_motivo: motivoRecusa.trim(),
      });
      if (error) throw error;
      await reembolsarPagamentoDoPedido(pedido!.id);
      toast({ title: "Pedido reprovado" });
      setShowRecusar(false);
      setMotivoRecusa("");
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro ao reprovar", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const openAnvisaDialog = () => {
    setAnvisaDecisao(null);
    setAnvisaFile(null);
    setShowAnvisa(true);
  };

  const handleAnvisaFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo ${MAX_UPLOAD_MB}MB`, variant: "destructive" });
      return;
    }
    if (!ACCEPTED_MIMES.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Aceitos: PDF, PNG, JPG", variant: "destructive" });
      return;
    }
    setAnvisaFile(file);
  };

  const handleFinalizarAnvisa = async () => {
    if (!pedido || !anvisaDecisao) return;
    try {
      setAnvisaSaving(true);
      if (anvisaDecisao === "aprovada") {
        if (!anvisaFile) {
          toast({ title: "Anexe o arquivo da autorização", variant: "destructive" });
          return;
        }
        const ext = anvisaFile.name.split(".").pop() || "pdf";
        const path = `pedido_anvisa/${pedido.id}/autorizacao_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(path, anvisaFile, {
          cacheControl: "3600", upsert: true, contentType: anvisaFile.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
        const { error } = await supabase.rpc("admin_registrar_anvisa", {
          p_id: pedido.id,
          p_aprovado: true,
          p_arquivo_url: pub.publicUrl,
          p_nome_arquivo: anvisaFile.name,
        });
        if (error) throw error;
        toast({ title: "Autorização Anvisa registrada" });
        setShowAnvisa(false);
        fetchPedido();
      } else {
        const { error } = await supabase.rpc("admin_registrar_anvisa", {
          p_id: pedido.id,
          p_aprovado: false,
          p_arquivo_url: null,
          p_nome_arquivo: null,
        });
        if (error) throw error;
        setShowAnvisa(false);
        setShowAnvisaFeedback(true);
        fetchPedido();
      }
    } catch (e: any) {
      toast({ title: "Erro ao registrar Anvisa", description: e.message, variant: "destructive" });
    } finally {
      setAnvisaSaving(false);
    }
  };

  const openEntregaDialog = () => {
    if (!pedido) return;
    const initial: "em_separacao" | "enviado" | "entregue" =
      pedido.status === "enviado" || pedido.status === "entregue" || pedido.status === "em_separacao"
        ? (pedido.status as "em_separacao" | "enviado" | "entregue")
        : "em_separacao";
    setEntregaStatus(initial);
    setEntregaRastreio(pedido.codigo_rastreio ?? "");
    setEntregaInicio(pedido.prazo_entrega_inicio ?? "");
    setEntregaFim(pedido.prazo_entrega_fim ?? "");
    setEntregaObs("");
    setShowEntrega(true);
  };

  const handleUpdateEntrega = async () => {
    if (entregaInicio && entregaFim && entregaInicio > entregaFim) {
      toast({ title: "Prazo inválido", description: "Data inicial deve ser anterior ou igual à final.", variant: "destructive" });
      return;
    }
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_update_pedido_entrega", {
        p_id: pedido!.id,
        p_status: entregaStatus,
        p_codigo_rastreio: entregaRastreio.trim() ? entregaRastreio.trim() : null,
        p_prazo_entrega_inicio: entregaInicio || null,
        p_prazo_entrega_fim: entregaFim || null,
        p_observacao: entregaObs.trim() ? entregaObs.trim() : null,
      });
      if (error) throw error;
      toast({ title: "Entrega atualizada" });
      setShowEntrega(false);
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar entrega", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleCopyRastreio = async () => {
    if (!pedido?.codigo_rastreio) return;
    try {
      await navigator.clipboard.writeText(pedido.codigo_rastreio);
      toast({ title: "Código copiado" });
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
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

  if (!pedido) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-6 py-8 max-w-[1080px] mx-auto">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(pedido.status);

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
          <Link to="/pedidos" className="hover:text-primary">Receitas e pedidos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Pedido #{pedido.numero_pedido}</span>
        </nav>

        {/* Banners por estado */}
        {pedido.status === "pendente" && (
          <div className="flex items-start gap-3 bg-card-yellow rounded-[10px] px-5 py-4 mb-6">
            <AlertCircle className="h-5 w-5 text-[hsl(36_80%_42%)] shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Pedido pendente de aprovação. Por favor, revise os documentos anexados ao pedido antes de aprovar ou reprovar.
            </p>
          </div>
        )}
        {reprovado && (
          <div className="flex items-start gap-3 bg-card-red rounded-[10px] px-5 py-4 mb-6">
            <ShieldX className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">Pedido reprovado pela equipe Canfy.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Dados do pedido</h2>
          <div className="flex flex-wrap gap-2 justify-end">
            {["aprovado", "em_separacao", "enviado", "entregue"].includes(pedido.status) && (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                onClick={openEntregaDialog}
              >
                <Truck className="h-4 w-4" />
                Atualizar entrega
              </Button>
            )}
            {pedido.status === "aprovado" &&
              meFields?.melhor_envio_servico_id != null &&
              !meFields?.melhor_envio_order_id && (
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                  onClick={openEtiquetaDialog}
                >
                  <Package className="h-4 w-4" />
                  Gerar etiqueta ME
                </Button>
              )}
            {meFields?.melhor_envio_etiqueta_url && (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                onClick={() => window.open(meFields.melhor_envio_etiqueta_url!, "_blank")}
              >
                <Download className="h-4 w-4" />
                Etiqueta PDF
              </Button>
            )}
            {!reprovado && pedido.status !== "cancelado" && (
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
                onClick={openAnvisaDialog}
              >
                <ShieldCheck className="h-4 w-4" />
                Autorização Anvisa
              </Button>
            )}
            {pedido.status === "pendente" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setShowRecusar(true)}
                >
                  <ShieldX className="h-4 w-4" />
                  Reprovar pedido
                </Button>
                <Button
                  className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-full"
                  onClick={() => setShowAprovar(true)}
                >
                  <Check className="h-4 w-4" />
                  Aprovar pedido
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Card identificação + status */}
        <Card className="rounded-[10px] bg-secondary border-none mb-3">
          <CardContent className="py-5 px-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Pedido #{pedido.numero_pedido}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Última atualização do pedido em {formatDate(pedido.rastreio_atualizado_em ?? pedido.data_pedido)}.
              </p>
            </div>
            <Badge
              style={{ backgroundColor: badge.bg, color: badge.fg }}
              className="border-none rounded-full px-4 py-1 font-medium shrink-0"
            >
              {badge.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Card dados */}
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="grid grid-cols-2 gap-x-12 gap-y-5 px-6 py-6">
            <Field label="Paciente" value={pedido.paciente_nome} />
            <Field label="Data do pedido" value={formatDate(pedido.data_pedido)} />
            <Field label="Prescritor" value={pedido.medico_nome ?? "—"} />
            <Field label="Total pago" value={formatCurrency(pedido.valor_total)} />
            <Field label="Id da receita" value={pedido.numero_receita ?? "—"} />
            <Field label="Emissão da receita" value={formatDate(pedido.data_emissao)} />
          </CardContent>
        </Card>

        {/* Produtos do pedido */}
        {produtos.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4">Produtos do pedido</h2>
            <Card className="rounded-[10px] bg-secondary border-none mb-8">
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-6">
                {produtos.map((prod) => (
                  <div key={prod.item_id} className="bg-card rounded-[10px] p-4 flex gap-4">
                    <div className="h-14 w-14 rounded-full bg-card-green flex items-center justify-center shrink-0 overflow-hidden">
                      {prod.imagem_url ? (
                        <img src={prod.imagem_url} alt={prod.produto_nome} className="h-full w-full object-cover" />
                      ) : (
                        <Pill className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-bold text-foreground truncate">{prod.produto_nome}</p>
                        {prod.fornecedor_tipo && (
                          <Badge
                            className="border-none rounded-full px-3 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: "hsl(var(--card-purple))", color: "hsl(291 47% 35%)" }}
                          >
                            {prod.fornecedor_tipo === "marca" ? "Marca" : "Associação"}
                          </Badge>
                        )}
                      </div>
                      <dl className="text-xs text-muted-foreground space-y-1">
                        {prod.fornecedor_nome && (
                          <ItemRow label="Canal de aquisição" value={prod.fornecedor_nome} />
                        )}
                        {prod.forma_farmaceutica && (
                          <ItemRow label="Formas de uso" value={FORMA_LABEL[prod.forma_farmaceutica] ?? prod.forma_farmaceutica} />
                        )}
                        {prod.posologia && <ItemRow label="Dosagem" value={prod.posologia} />}
                        {(prod.concentracao_thc || prod.concentracao_cbd) && (
                          <ItemRow
                            label="Concentração"
                            value={[prod.concentracao_thc && `${prod.concentracao_thc} de THC`, prod.concentracao_cbd && `${prod.concentracao_cbd} de CBD`]
                              .filter(Boolean)
                              .join(" • ")}
                          />
                        )}
                        <ItemRow label="Quantidade" value={String(prod.quantidade)} />
                      </dl>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        <h2 className="text-xl font-bold text-foreground mb-4">Linha do tempo do pedido</h2>

        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="px-6 py-6">
            {["aprovado", "em_separacao", "enviado", "entregue"].includes(pedido.status) && (
              <p className="text-base text-foreground mb-6">{prazoLabel}</p>
            )}

            <ol className="space-y-0">
              {TIMELINE_STAGES.map((_, i) => {
                const done = i <= currentStage;
                const isLast = i === TIMELINE_STAGES.length - 1;
                const isReprovadoStep = i === 1 && reprovado;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={
                          done
                            ? "h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                            : "h-6 w-6 rounded-full border-2 border-muted-foreground/40"
                        }
                      >
                        {done && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </div>
                      {!isLast && (
                        <div className={i < currentStage ? "w-0.5 h-8 bg-primary my-1" : "w-0.5 h-8 bg-muted-foreground/30 my-1"} />
                      )}
                    </div>
                    <div className="pb-6">
                      <span className={done ? "text-sm font-bold text-primary" : "text-sm font-bold text-muted-foreground/60"}>
                        {stageLabel(i)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {done && !isReprovadoStep
                          ? formatTimeline(stageDate[i])
                          : isReprovadoStep
                            ? formatTimeline(stageDate[1])
                            : "00/00/0000, às 00h00"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Rastreio — só quando há código */}
        {(pedido.codigo_rastreio || ["enviado", "entregue"].includes(pedido.status)) && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4">Rastreio</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="px-6 py-5">
                  <p className="text-sm font-semibold text-foreground mb-3">Código de rastreio</p>
                  {pedido.codigo_rastreio ? (
                    <button
                      onClick={handleCopyRastreio}
                      className="bg-card-green/60 hover:bg-card-green text-primary rounded-full px-4 py-2 text-sm w-full flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-mono">{pedido.codigo_rastreio}</span>
                      <Copy className="h-4 w-4 shrink-0" />
                    </button>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">Não disponível</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="px-6 py-5">
                  <p className="text-sm text-muted-foreground mb-1">última atualização</p>
                  <p className="text-base font-semibold text-foreground">{formatDateTime(pedido.rastreio_atualizado_em)}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Documentos */}
        {(pedido.documentos ?? []).length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4">Documentos</h2>
            <div className="grid grid-cols-2 gap-4">
              {(pedido.documentos ?? []).map((doc) => (
                <Card key={doc.id} className="rounded-[10px] bg-secondary border-none">
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
              ))}
            </div>
          </>
        )}

        {/* Modal: Pedido pendente / aprovar */}
        <Dialog open={showAprovar} onOpenChange={setShowAprovar}>
          <DialogContent className="sm:max-w-[420px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Pedido pendente</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAprovar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Pedido <span className="font-semibold">#{pedido.numero_pedido}</span> será marcado como aprovado.
            </p>
            <label className="text-sm font-semibold mb-1 block">Observação (opcional)</label>
            <Textarea
              value={obsAprovar}
              onChange={(e) => setObsAprovar(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="Anote algo relevante sobre essa aprovação..."
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => { setShowAprovar(false); setShowRecusar(true); }}
                disabled={acting}
              >
                <X className="h-4 w-4 mr-1" /> Reprovar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleAprovar} disabled={acting}>
                <Check className="h-4 w-4 mr-1" /> Aprovar pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Pedido reprovado (justificativa) */}
        <Dialog open={showRecusar} onOpenChange={setShowRecusar}>
          <DialogContent className="sm:max-w-[420px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Pedido reprovado</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRecusar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <label className="text-sm font-semibold mb-1 block">Justificativa</label>
            <Textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              className="min-h-[100px] resize-none"
              placeholder="Explique brevemente o motivo por ter reprovado o pedido"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowRecusar(false)} disabled={acting}>
                Voltar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleRecusar} disabled={acting}>
                Finalizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Autorização Anvisa */}
        <Dialog open={showAnvisa} onOpenChange={setShowAnvisa}>
          <DialogContent className="sm:max-w-[440px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Autorização Anvisa</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAnvisa(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, atualize se a solicitação feita no site do gov.br foi aprovada ou negada pela Anvisa:
            </p>

            <div className="space-y-3 mb-4">
              <button
                className="flex items-center gap-3 w-full text-left"
                onClick={() => setAnvisaDecisao("aprovada")}
              >
                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${anvisaDecisao === "aprovada" ? "border-primary" : "border-muted-foreground/50"}`}>
                  {anvisaDecisao === "aprovada" && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="text-sm text-foreground flex items-center gap-2">
                  A solicitação foi aprovada <Check className="h-4 w-4 text-primary" />
                </span>
              </button>
              <button
                className="flex items-center gap-3 w-full text-left"
                onClick={() => { setAnvisaDecisao("negada"); setAnvisaFile(null); }}
              >
                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${anvisaDecisao === "negada" ? "border-primary" : "border-muted-foreground/50"}`}>
                  {anvisaDecisao === "negada" && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="text-sm text-foreground flex items-center gap-2">
                  A solicitação foi negada <X className="h-4 w-4 text-destructive" />
                </span>
              </button>
            </div>

            {anvisaDecisao === "aprovada" && (
              <div>
                <hr className="border-border/60 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">Adicione o arquivo da solicitação abaixo</p>
                <input
                  ref={anvisaInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    handleAnvisaFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {!anvisaFile ? (
                  <button
                    type="button"
                    onClick={() => anvisaInputRef.current?.click()}
                    className="w-full rounded-[12px] border-2 border-dashed border-primary/60 bg-card-green/30 hover:bg-card-green/50 py-8 flex flex-col items-center gap-2 transition-colors"
                  >
                    <UploadCloud className="h-7 w-7 text-primary" />
                    <span className="text-sm font-medium text-primary">Clique para adicionar o arquivo</span>
                  </button>
                ) : (
                  <div className="rounded-[12px] border-2 border-primary/60 bg-card-green/30 py-6 flex flex-col items-center gap-2">
                    <FileText className="h-7 w-7 text-primary" />
                    <span className="text-sm font-medium text-primary truncate max-w-[80%]">{anvisaFile.name}</span>
                    <div className="flex items-center gap-4 mt-1">
                      <button type="button" className="flex items-center gap-1 text-sm text-primary" onClick={() => anvisaInputRef.current?.click()}>
                        <RefreshCw className="h-4 w-4" /> Substituir
                      </button>
                      <span className="h-4 w-px bg-border" />
                      <button type="button" className="flex items-center gap-1 text-sm text-destructive" onClick={() => setAnvisaFile(null)}>
                        <Trash2 className="h-4 w-4" /> Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAnvisa(false)} disabled={anvisaSaving}>
                Voltar
              </Button>
              <Button
                className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full"
                onClick={handleFinalizarAnvisa}
                disabled={anvisaSaving || !anvisaDecisao || (anvisaDecisao === "aprovada" && !anvisaFile)}
              >
                {anvisaSaving ? "Salvando..." : "Finalizar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: feedback Anvisa negada */}
        <Dialog open={showAnvisaFeedback} onOpenChange={setShowAnvisaFeedback}>
          <DialogContent className="sm:max-w-[420px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Autorização Anvisa</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAnvisaFeedback(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <p className="text-sm font-semibold text-foreground mb-2">A autorização da Anvisa foi negada.</p>
            <p className="text-sm text-muted-foreground mb-4">
              O paciente será notificado sobre o cancelamento do pedido e receberá o reembolso do valor pago.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setShowAnvisaFeedback(false)}
            >
              Fechar
            </Button>
          </DialogContent>
        </Dialog>

        {/* Modal: Atualizar entrega */}
        <Dialog open={showEntrega} onOpenChange={setShowEntrega}>
          <DialogContent className="sm:max-w-[520px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Atualizar entrega</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEntrega(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <label className="text-sm font-semibold mb-1 block">Status do pedido</label>
            <select
              value={entregaStatus}
              onChange={(e) => setEntregaStatus(e.target.value as "em_separacao" | "enviado" | "entregue")}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-3"
            >
              <option value="em_separacao">Em separação</option>
              <option value="enviado">Enviado</option>
              <option value="entregue">Entregue</option>
            </select>

            <label className="text-sm font-semibold mb-1 block">Código de rastreio</label>
            <input
              type="text"
              value={entregaRastreio}
              onChange={(e) => setEntregaRastreio(e.target.value)}
              placeholder="Informado pela transportadora"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-3 font-mono"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Prazo — início</label>
                <input
                  type="date"
                  value={entregaInicio}
                  onChange={(e) => setEntregaInicio(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Prazo — fim</label>
                <input
                  type="date"
                  value={entregaFim}
                  onChange={(e) => setEntregaFim(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

            <label className="text-sm font-semibold mb-1 block">Observação (opcional)</label>
            <Textarea
              value={entregaObs}
              onChange={(e) => setEntregaObs(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="Notas sobre essa atualização..."
            />

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowEntrega(false)} disabled={acting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleUpdateEntrega} disabled={acting}>
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Gerar etiqueta Melhor Envio */}
        <Dialog open={showEtiqueta} onOpenChange={setShowEtiqueta}>
          <DialogContent className="sm:max-w-[640px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Gerar etiqueta Melhor Envio</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEtiqueta(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Confirme/edite os dados do destinatário antes de gerar a etiqueta.
              </p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Nome completo *</label>
                <Input value={destNome} onChange={(e) => setDestNome(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">CPF *</label>
                <Input value={destDoc} onChange={(e) => setDestDoc(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                <Input value={destPhone} onChange={(e) => setDestPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input value={destEmail} onChange={(e) => setDestEmail(e.target.value)} type="email" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Logradouro *</label>
                <Input value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Número *</label>
                <Input value={destNumber} onChange={(e) => setDestNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Complemento</label>
                <Input value={destComplement} onChange={(e) => setDestComplement(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Bairro *</label>
                <Input value={destDistrict} onChange={(e) => setDestDistrict(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cidade *</label>
                <Input value={destCity} onChange={(e) => setDestCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">UF *</label>
                <Input value={destState} onChange={(e) => setDestState(e.target.value)} maxLength={2} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">CEP *</label>
                <Input value={destCep} onChange={(e) => setDestCep(e.target.value)} placeholder="00000-000" />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowEtiqueta(false)} disabled={etiquetaLoading}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleGerarEtiqueta} disabled={etiquetaLoading}>
                {etiquetaLoading ? "Gerando..." : "Gerar etiqueta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

function Field({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="border-b border-border/40 pb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold text-foreground ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function ItemRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export default PedidoDetalhes;
