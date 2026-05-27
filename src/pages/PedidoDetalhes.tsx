import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, Copy, Download, X, ShieldCheck, ShieldX } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AnvisaStatus = "nao_solicitado" | "em_analise" | "aprovado" | "recusado";

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

const STAGES = [
  { key: "validando_documentos", label: "Validando documentos" },
  { key: "liberando_importacao", label: "Liberando importação" },
  { key: "importacao_liberada", label: "Importação liberada" },
  { key: "pedido_na_anvisa", label: "Pedido na Anvisa" },
  { key: "pedido_liberado_anvisa", label: "Pedido liberado pela Anvisa" },
  { key: "pedido_entregue", label: "Pedido entregue" },
] as const;

const stageIndexFor = (status: string, statusAnvisa: AnvisaStatus): number => {
  if (status === "entregue") return STAGES.length - 1;
  if (statusAnvisa === "aprovado") return 4;
  if (statusAnvisa === "em_analise") return 3;
  if (statusAnvisa === "recusado") return 3;
  if (status === "em_separacao" || status === "enviado") return 2;
  if (status === "aprovado") return 1;
  return 0;
};

const formatCurrency = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

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

const PedidoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pedido, setPedido] = useState<PedidoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAprovar, setShowAprovar] = useState(false);
  const [showRecusar, setShowRecusar] = useState(false);
  const [showAnvisa, setShowAnvisa] = useState(false);
  const [obsAprovar, setObsAprovar] = useState("");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [novoStatusAnvisa, setNovoStatusAnvisa] = useState<AnvisaStatus>("em_analise");
  const [obsAnvisa, setObsAnvisa] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPedido = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_get_pedido_detalhes", { p_id: id! });
      if (error) throw error;
      if (data && data.length > 0) setPedido(data[0] as PedidoDetalhes);
    } catch (e: any) {
      toast({
        title: "Erro ao carregar pedido",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStage = useMemo(
    () => (pedido ? stageIndexFor(pedido.status, pedido.status_anvisa) : -1),
    [pedido]
  );

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
      toast({ title: "Informe o motivo da recusa", variant: "destructive" });
      return;
    }
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_recusar_pedido", {
        p_id: pedido!.id,
        p_motivo: motivoRecusa.trim(),
      });
      if (error) throw error;
      toast({ title: "Pedido recusado" });
      setShowRecusar(false);
      setMotivoRecusa("");
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro ao recusar", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleUpdateAnvisa = async () => {
    try {
      setActing(true);
      const { error } = await supabase.rpc("admin_update_pedido_anvisa", {
        p_id: pedido!.id,
        p_status_anvisa: novoStatusAnvisa,
        p_observacao: obsAnvisa || null,
      });
      if (error) throw error;
      toast({ title: "Status Anvisa atualizado" });
      setShowAnvisa(false);
      setObsAnvisa("");
      fetchPedido();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
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

        <div className="px-6 py-8 max-w-[1400px] mx-auto">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
        </div>
      </div>
    );
  }

  const anvisaBadge =
    pedido.status_anvisa !== "nao_solicitado"
      ? { label: "Pedido na Anvisa", bg: "hsl(var(--card-purple))", fg: "hsl(291 47% 35%)" }
      : null;

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
          <Link to="/receitas" className="hover:text-primary">Receitas e pedidos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Pedido #{pedido.numero_pedido}</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Dados do pedido</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              onClick={() => {
                setNovoStatusAnvisa(pedido.status_anvisa);
                setShowAnvisa(true);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Atualizar status Anvisa
            </Button>
            {pedido.status === "pendente" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setShowRecusar(true)}
                >
                  <ShieldX className="h-4 w-4" />
                  Recusar pedido
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

        <Card className="rounded-[10px] bg-secondary border-none mb-3">
          <CardContent className="py-5 px-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Pedido #{pedido.numero_pedido}</h3>
            {anvisaBadge && (
              <Badge
                style={{ backgroundColor: anvisaBadge.bg, color: anvisaBadge.fg }}
                className="border-none rounded-full px-4 py-1 font-medium"
              >
                {anvisaBadge.label}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="grid grid-cols-2 gap-x-12 gap-y-5 px-6 py-6">
            <Field label="Id da receita" value={pedido.numero_receita ?? "—"} />
            <Field label="Emissão da receita" value={formatDate(pedido.data_emissao)} />
            <Field label="Paciente" value={pedido.paciente_nome} />
            <Field label="Canal de associação" value={pedido.canal_aquisicao} capitalize />
            <Field label="Prescritor" value={pedido.medico_nome ?? "—"} />
            <Field label="Total pago" value={formatCurrency(pedido.valor_total)} />
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Linha do tempo do pedido</h2>

        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="px-6 py-6">
            <p className="text-base text-foreground mb-6">{prazoLabel}</p>

            <ol className="space-y-0">
              {STAGES.map((stage, i) => {
                const done = i <= currentStage;
                const isLast = i === STAGES.length - 1;
                return (
                  <li key={stage.key} className="flex items-start gap-3">
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
                        <div
                          className={
                            i < currentStage
                              ? "w-0.5 h-7 bg-primary my-1"
                              : "w-0.5 h-7 bg-muted-foreground/30 my-1"
                          }
                        />
                      )}
                    </div>
                    <span
                      className={
                        done
                          ? "text-sm font-bold text-primary pt-0.5 pb-7"
                          : "text-sm font-bold text-muted-foreground/60 pt-0.5 pb-7"
                      }
                    >
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Rastreio</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
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
              <p className="text-base font-semibold text-foreground">
                {formatDateTime(pedido.rastreio_atualizado_em)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showAprovar} onOpenChange={setShowAprovar}>
          <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Aprovar pedido</DialogTitle>
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
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAprovar(false)} disabled={acting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleAprovar} disabled={acting}>
                Aprovar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRecusar} onOpenChange={setShowRecusar}>
          <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Recusar pedido</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRecusar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <label className="text-sm font-semibold mb-1 block">Motivo da recusa</label>
            <Textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              className="min-h-[100px] resize-none"
              placeholder="Explique o motivo para o paciente..."
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowRecusar(false)} disabled={acting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full" onClick={handleRecusar} disabled={acting}>
                Confirmar recusa
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAnvisa} onOpenChange={setShowAnvisa}>
          <DialogContent className="sm:max-w-[480px] p-6 [&>button]:hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold">Atualizar status Anvisa</DialogTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAnvisa(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <label className="text-sm font-semibold mb-1 block">Status</label>
            <select
              value={novoStatusAnvisa}
              onChange={(e) => setNovoStatusAnvisa(e.target.value as AnvisaStatus)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-3"
            >
              <option value="nao_solicitado">Não solicitado</option>
              <option value="em_analise">Em análise</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
            </select>
            <label className="text-sm font-semibold mb-1 block">Observação (opcional)</label>
            <Textarea
              value={obsAnvisa}
              onChange={(e) => setObsAnvisa(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="Notas sobre essa mudança de status..."
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowAnvisa(false)} disabled={acting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleUpdateAnvisa} disabled={acting}>
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </div>
  );
};

function Field({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="border-b border-border/40 pb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold text-foreground ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default PedidoDetalhes;
