import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, MoreVertical, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Notificacao = Database["public"]["Tables"]["notificacoes"]["Row"];
type DestinatarioTipo = Database["public"]["Enums"]["destinatario_tipo"];
type TipoEnvio = Database["public"]["Enums"]["tipo_envio"];

const NotificacoesPersonalizadas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaNotificacaoOpen, setNovaNotificacaoOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [destinatario, setDestinatario] = useState<DestinatarioTipo | "">("");
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio | "">("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const fetchNotificacoes = async () => {
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("tipo", "personalizada")
      .order("data_envio", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    setNotificacoes(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotificacoes();
  }, []);

  useRealtimeSubscription({
    table: "notificacoes",
    onInsert: () => fetchNotificacoes(),
    onUpdate: () => fetchNotificacoes(),
    onDelete: () => fetchNotificacoes(),
  });

  const resetForm = () => {
    setTitulo("");
    setObservacoes("");
    setDestinatario("");
    setTipoEnvio("");
    setData("");
    setHora("");
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !observacoes.trim() || !destinatario || !tipoEnvio) {
      toast({
        title: "Preencha todos os campos",
        description: "Título, descrição, destinatário e tipo de envio são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    let dataEnvio = new Date().toISOString();
    if (tipoEnvio === "agendado") {
      if (!data || !hora) {
        toast({
          title: "Data e hora obrigatórias",
          description: "Para envio agendado informe data e hora.",
          variant: "destructive",
        });
        return;
      }
      const combinado = new Date(`${data}T${hora}:00`);
      if (Number.isNaN(combinado.getTime())) {
        toast({
          title: "Data inválida",
          description: "Verifique data e hora.",
          variant: "destructive",
        });
        return;
      }
      dataEnvio = combinado.toISOString();
    }

    setSalvando(true);
    const { error } = await supabase.from("notificacoes").insert({
      titulo: titulo.trim(),
      descricao: observacoes.trim(),
      tipo: "personalizada",
      categoria: "geral",
      tipo_envio: tipoEnvio,
      destinatario_tipo: destinatario,
      data_envio: dataEnvio,
    });

    if (error) {
      setSalvando(false);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    // Envio imediato: dispara e-mail (canal externo) além da entrega in-app.
    // Best-effort: se o provedor não estiver configurado, a notificação in-app já foi salva.
    if (tipoEnvio === "imediato") {
      try {
        const { data: dispatch } = await supabase.functions.invoke("dispatch-notificacao", {
          body: {
            titulo: titulo.trim(),
            descricao: observacoes.trim(),
            destinatario_tipo: destinatario,
          },
        });
        if (dispatch && (dispatch as any).dispatched) {
          toast({
            title: "Notificação enviada",
            description: `E-mail disparado para ${(dispatch as any).recipients} destinatário(s).`,
          });
        } else {
          toast({
            title: "Notificação salva",
            description: "Entregue no app. E-mail não enviado (provedor não configurado).",
          });
        }
      } catch {
        toast({
          title: "Notificação salva",
          description: "Entregue no app. Falha ao disparar e-mail externo.",
        });
      }
      setSalvando(false);
      setNovaNotificacaoOpen(false);
      resetForm();
      fetchNotificacoes();
      return;
    }

    setSalvando(false);
    toast({ title: "Notificação agendada", description: "Notificação cadastrada com sucesso." });
    setNovaNotificacaoOpen(false);
    resetForm();
    fetchNotificacoes();
  };

  const handleExcluir = async (id: string) => {
    const { error } = await supabase.from("notificacoes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notificação excluída" });
    fetchNotificacoes();
  };

  const formatData = (iso: string) =>
    format(new Date(iso), "dd/MM/yy • HH:mm", { locale: ptBR });

  const statusOf = (n: Notificacao) => {
    const enviada = new Date(n.data_envio).getTime() <= Date.now();
    return enviada
      ? { label: "Enviada", color: "bg-card-green text-primary-dark" }
      : { label: "Agendada", color: "bg-card-blue text-[hsl(207_89%_35%)]" };
  };

  const destinatarioLabel = (tipo: DestinatarioTipo) => {
    switch (tipo) {
      case "todos":
        return "Todos os usuários";
      case "todos_medicos":
        return "Todos os médicos";
      case "todos_pacientes":
        return "Todos os pacientes";
      case "especifico":
        return "Destinatário específico";
    }
  };

  const podeMostrarDataHora = useMemo(() => tipoEnvio === "agendado", [tipoEnvio]);

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/notificacoes")}
            className="gap-2 text-foreground hover:bg-transparent p-0"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </Button>
          <Button
            onClick={() => setNovaNotificacaoOpen(true)}
            className="gap-2 bg-card text-primary border border-primary hover:bg-primary/10 rounded-full"
          >
            <Plus className="h-4 w-4" />
            Nova notificação
          </Button>
        </div>

        <Dialog open={novaNotificacaoOpen} onOpenChange={setNovaNotificacaoOpen}>
          <DialogContent className="max-w-md [&>button]:hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold mb-1">
                    Cadastrar nova notificação
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Preencha as informações abaixo para cadastrar uma nova notificação.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNovaNotificacaoOpen(false)}
                  className="h-6 w-6 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da notificação</Label>
                <div className="relative">
                  <Input
                    id="titulo"
                    placeholder="Ex.: Consulta confirmada"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value.slice(0, 50))}
                    maxLength={50}
                  />
                  <span className="absolute right-3 top-3 text-xs text-muted-foreground">
                    {titulo.length}/50
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Descrição</Label>
                <div className="relative">
                  <Textarea
                    id="observacoes"
                    placeholder="Ex.: Sua consulta está marcada para amanhã às 15h."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value.slice(0, 200))}
                    maxLength={200}
                    className="min-h-[80px] resize-none"
                  />
                  <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                    {observacoes.length}/200
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatario">Destinatário</Label>
                <Select
                  value={destinatario}
                  onValueChange={(v) => setDestinatario(v as DestinatarioTipo)}
                >
                  <SelectTrigger id="destinatario">
                    <SelectValue placeholder="Selecione os destinatários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    <SelectItem value="todos_pacientes">Todos os pacientes</SelectItem>
                    <SelectItem value="todos_medicos">Todos os médicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-envio">Tipo de envio</Label>
                <Select value={tipoEnvio} onValueChange={(v) => setTipoEnvio(v as TipoEnvio)}>
                  <SelectTrigger id="tipo-envio">
                    <SelectValue placeholder="Selecione o tipo de envio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediato">Envio imediato</SelectItem>
                    <SelectItem value="agendado">Envio agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {podeMostrarDataHora && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora">Hora</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setNovaNotificacaoOpen(false);
                    resetForm();
                  }}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground"
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar notificação"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Notificações <span className="mx-1">›</span>{" "}
            <span className="text-foreground font-semibold">Notificações personalizadas</span>
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : notificacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação personalizada cadastrada.
          </p>
        ) : (
          <div className="space-y-4">
            {notificacoes.map((notif) => {
              const status = statusOf(notif);
              return (
                <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} px-3 py-1 rounded-md font-medium`}>
                            {status.label}
                          </Badge>
                          <span className="text-sm text-foreground">
                            {formatData(notif.data_envio)}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleExcluir(notif.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-semibold">Título: </span>
                          <span className="text-sm text-muted-foreground">{notif.titulo}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Descrição: </span>
                          <span className="text-sm text-muted-foreground">{notif.descricao}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Destinatário: </span>
                          <span className="text-sm text-muted-foreground">
                            {destinatarioLabel(notif.destinatario_tipo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificacoesPersonalizadas;
