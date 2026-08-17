import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useInvalidarNotificacoesNaoLidas } from "@/hooks/useNotificacoesNaoLidas";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Notificacao = Database["public"]["Tables"]["notificacoes"]["Row"];
type CategoriaEnum = Database["public"]["Enums"]["categoria_notificacao"];

const FILTROS: Array<{ label: string; categoria: CategoriaEnum | null }> = [
  { label: "Todos", categoria: null },
  { label: "Financeiras", categoria: "financeira" },
  { label: "Gestão de usuários", categoria: "gestao_usuarios" },
  { label: "Gestão de pedidos e receitas", categoria: "gestao_pedidos" },
  { label: "Catálogo, associações e marcas", categoria: "catalogo" },
  { label: "Alertas técnicos", categoria: "alertas_tecnicos" },
  { label: "Engajamento e uso da plataforma", categoria: "engajamento" },
  { label: "Riscos e segurança", categoria: "riscos" },
  { label: "Gerais", categoria: "geral" },
];

const Notificacoes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidarNaoLidas = useInvalidarNotificacoesNaoLidas();
  const [selectedFilter, setSelectedFilter] = useState<string>("Todos");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotificacoes = async () => {
    const { data, error } = await supabase.rpc("listar_minhas_notificacoes");

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

  const handleMarcarComoLida = async (id: string) => {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
    );
    invalidarNaoLidas();
  };

  const handleMarcarTodasComoLidas = async () => {
    const naoLidas = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (naoLidas.length === 0) return;

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .in("id", naoLidas);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    fetchNotificacoes();
    invalidarNaoLidas();
  };

  const filtroAtual = FILTROS.find((f) => f.label === selectedFilter) ?? FILTROS[0];

  const filtradas = useMemo(() => {
    if (filtroAtual.categoria === null) return notificacoes;
    return notificacoes.filter((n) => n.categoria === filtroAtual.categoria);
  }, [notificacoes, filtroAtual]);

  const naoLidas = useMemo(() => filtradas.filter((n) => !n.lida), [filtradas]);

  const grupos = useMemo(() => {
    const hoje: Notificacao[] = [];
    const ontem: Notificacao[] = [];
    const anteriores = new Map<string, Notificacao[]>();

    for (const n of filtradas) {
      const d = new Date(n.data_envio);
      if (isToday(d)) hoje.push(n);
      else if (isYesterday(d)) ontem.push(n);
      else {
        const key = format(d, "dd MMM., yyyy", { locale: ptBR }).toUpperCase();
        const arr = anteriores.get(key) ?? [];
        arr.push(n);
        anteriores.set(key, arr);
      }
    }

    return { hoje, ontem, anteriores: Array.from(anteriores.entries()) };
  }, [filtradas]);

  const formatData = (iso: string) =>
    format(new Date(iso), "dd MMM. yyyy • HH:mm", { locale: ptBR });

  const renderCard = (notif: Notificacao) => (
    <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-card-purple flex items-center justify-center relative">
              <Mail className="h-6 w-6 text-[hsl(291_47%_45%)]" />
              {!notif.lida && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">{notif.titulo}</h3>
            <p className="text-sm text-muted-foreground mb-2">{notif.descricao}</p>
            <p className="text-xs text-muted-foreground mb-3">{formatData(notif.data_envio)}</p>
            <div className="flex gap-2">
              {!notif.lida && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleMarcarComoLida(notif.id)}
                  className="h-9 text-primary hover:text-primary-dark p-0"
                >
                  Marcar como lida
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLista = (lista: Notificacao[]) => {
    if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
    if (lista.length === 0)
      return <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>;
    return <div className="space-y-4">{lista.map(renderCard)}</div>;
  };

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <div className="flex gap-2">
            {notificacoes.some((n) => !n.lida) && (
              <Button
                variant="ghost"
                onClick={handleMarcarTodasComoLidas}
                className="text-primary hover:bg-primary/10 rounded-full"
              >
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/notificacoes/personalizadas")}
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
            >
              <Settings className="h-4 w-4" />
              Notificações personalizadas
            </Button>
          </div>
        </div>

        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="mb-6 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger
              value="todas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 pb-3 font-semibold"
            >
              Todas
            </TabsTrigger>
            <TabsTrigger
              value="nao-lidas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 pb-3 font-normal"
            >
              Não lidas {naoLidas.length > 0 && `(${naoLidas.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todas" className="mt-0">
            <div className="mb-8">
              <p className="text-sm font-semibold mb-3">Tipo de notificações</p>
              <div className="flex flex-wrap gap-2">
                {FILTROS.map((f) => (
                  <Badge
                    key={f.label}
                    onClick={() => setSelectedFilter(f.label)}
                    className={`cursor-pointer px-4 py-2 rounded-full text-sm ${
                      selectedFilter === f.label
                        ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground mb-4">HOJE</p>
              {renderLista(grupos.hoje)}
            </div>

            {grupos.ontem.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-semibold text-muted-foreground mb-4">ONTEM</p>
                {renderLista(grupos.ontem)}
              </div>
            )}

            {grupos.anteriores.map(([label, lista]) => (
              <div key={label} className="mb-8">
                <p className="text-sm font-semibold text-muted-foreground mb-4">{label}</p>
                {renderLista(lista)}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="nao-lidas">{renderLista(naoLidas)}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notificacoes;
