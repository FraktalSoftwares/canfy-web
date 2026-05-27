import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Feedback {
  id: string;
  nota: number;
  comentario: string | null;
  paciente_nome: string;
  medico_nome: string | null;
  data_consulta: string | null;
  created_at: string;
}

interface Resumo {
  total: number;
  media_geral: number;
  notas_baixas: number;
}

const FeedbacksConsultas = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [filtroNota, setFiltroNota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroNota]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [a, b] = await Promise.all([
        supabase.rpc("admin_list_feedbacks", { p_nota_min: filtroNota ?? undefined }),
        supabase.rpc("admin_get_feedbacks_resumo"),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      setItems((a.data as Feedback[]) || []);
      if (b.data && b.data.length > 0) setResumo(b.data[0] as Resumo);
    } catch (e: any) {
      toast({ title: "Erro ao carregar feedbacks", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8 max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Feedbacks de consultas</h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="px-6 py-5">
              <p className="text-sm text-muted-foreground mb-1">Total de feedbacks</p>
              <p className="text-3xl font-bold text-foreground">{resumo?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="px-6 py-5">
              <p className="text-sm text-muted-foreground mb-1">Média geral</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{Number(resumo?.media_geral ?? 0).toFixed(2)}</p>
                <Star className="h-5 w-5 fill-status-warning text-status-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="px-6 py-5">
              <p className="text-sm text-muted-foreground mb-1">Notas baixas (≤ 2)</p>
              <p className="text-3xl font-bold text-destructive">{resumo?.notas_baixas ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          {[null, 1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n ?? "all"}
              size="sm"
              variant={filtroNota === n ? "default" : "outline"}
              onClick={() => setFiltroNota(n)}
              className={
                filtroNota === n
                  ? "rounded-full bg-primary text-white hover:bg-primary-dark"
                  : "rounded-full"
              }
            >
              {n === null ? "Todos" : `≥ ${n}★`}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum feedback encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((f) => (
              <Card
                key={f.id}
                className={
                  f.nota <= 2
                    ? "rounded-[10px] bg-card-red/30 border-l-4 border-l-destructive"
                    : "rounded-[10px] bg-secondary border-none"
                }
              >
                <CardContent className="px-6 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{f.paciente_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Atendido por {f.medico_nome ?? "—"} •{" "}
                        {f.data_consulta
                          ? format(new Date(f.data_consulta), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={
                            n <= f.nota
                              ? "h-4 w-4 fill-status-warning text-status-warning"
                              : "h-4 w-4 text-muted-foreground/40"
                          }
                        />
                      ))}
                      {f.nota <= 2 && (
                        <Badge className="ml-2 border-none rounded-full px-2 py-0.5 bg-card-red text-destructive hover:bg-card-red text-xs">
                          Atenção
                        </Badge>
                      )}
                    </div>
                  </div>
                  {f.comentario && (
                    <p className="text-sm text-foreground mt-2">"{f.comentario}"</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbacksConsultas;
