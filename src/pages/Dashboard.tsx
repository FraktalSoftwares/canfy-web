import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import { PeriodoFilter, Periodo, periodoMesAtual } from "@/components/PeriodoFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface DashboardStats {
  receitas_emitidas: number;
  pedidos_realizados: number;
  aprovacoes_anvisa: number;
  produtos_catalogo: number;
  medicos_ativos: number;
  pacientes_ativos: number;
  associacoes_ativas: number;
  faturamento_pedidos: number;
  consultas_finalizadas: number;
  faturamento_consultas: number;
  faturamento_total: number;
}

interface MonthlyData {
  month: number;
  month_name: string;
  count: number;
}

interface MonthlyFaturamento {
  month: number;
  month_name: string;
  valor: number;
}

interface FeedbacksResumo {
  total: number;
  media_geral: number;
  notas_baixas: number;
}

type AnvisaStatus = "nao_solicitado" | "em_analise" | "aprovado" | "recusado";

interface RecentAnvisa {
  id: string;
  numero_pedido: string;
  paciente_nome: string;
  status_anvisa: AnvisaStatus;
  data_pedido: string;
}

interface RecentMedico {
  id: string;
  nome: string;
  email: string;
  crm: string;
  uf_crm: string;
  status: string;
  foto_perfil_url: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<Periodo>(periodoMesAtual());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [receitasData, setReceitasData] = useState<MonthlyData[]>([]);
  const [pedidosData, setPedidosData] = useState<MonthlyData[]>([]);
  const [faturamentoData, setFaturamentoData] = useState<MonthlyFaturamento[]>([]);
  const [recentAnvisa, setRecentAnvisa] = useState<RecentAnvisa[]>([]);
  const [recentMedicos, setRecentMedicos] = useState<RecentMedico[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbacksResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [periodo]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const p_data_ini = periodo.from.toISOString();
      const p_data_fim = periodo.to.toISOString();
      const ano = periodo.to.getFullYear();

      const { data: statsData, error: statsError } = await supabase.rpc(
        "admin_get_dashboard_stats",
        { p_data_ini, p_data_fim }
      );

      if (statsError) {
        if (statsError.message.includes("not authorized")) {
          toast({
            title: "Acesso negado",
            description:
              "Você não tem permissão para acessar o dashboard. Entre em contato com o administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw statsError;
      }

      if (statsData && statsData.length > 0) setStats(statsData[0] as DashboardStats);

      const { data: receitasMonthly, error: receitasError } = await supabase.rpc(
        "admin_get_monthly_receitas",
        { p_year: ano }
      );
      if (receitasError && !receitasError.message.includes("not authorized")) throw receitasError;
      setReceitasData(receitasMonthly || []);

      const { data: pedidosMonthly, error: pedidosError } = await supabase.rpc(
        "admin_get_monthly_pedidos",
        { p_year: ano }
      );
      if (pedidosError && !pedidosError.message.includes("not authorized")) throw pedidosError;
      setPedidosData(pedidosMonthly || []);

      const { data: faturamentoMonthly, error: faturamentoError } = await supabase.rpc(
        "admin_get_monthly_faturamento",
        { p_year: ano }
      );
      if (faturamentoError && !faturamentoError.message.includes("not authorized")) throw faturamentoError;
      setFaturamentoData(faturamentoMonthly || []);

      const { data: anvisa, error: anvisaError } = await supabase.rpc(
        "admin_get_recent_anvisa",
        { p_limit: 5 }
      );
      if (anvisaError && !anvisaError.message.includes("not authorized")) throw anvisaError;
      setRecentAnvisa((anvisa || []) as RecentAnvisa[]);

      const { data: medicos, error: medicosError } = await supabase.rpc(
        "admin_get_recent_medicos",
        { p_limit: 5 }
      );
      if (medicosError && !medicosError.message.includes("not authorized")) throw medicosError;
      setRecentMedicos(medicos || []);

      const { data: feedbacksResumo, error: feedbacksError } = await supabase.rpc(
        "admin_get_feedbacks_resumo",
        { p_data_ini, p_data_fim }
      );
      if (feedbacksError && !feedbacksError.message.includes("not authorized")) throw feedbacksError;
      if (feedbacksResumo && feedbacksResumo.length > 0)
        setFeedbacks(feedbacksResumo[0] as FeedbacksResumo);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro ao carregar dashboard",
        description: error.message || "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const anvisaTag = (status: AnvisaStatus) => {
    const map = {
      aprovado: { label: "Aprovado", bg: "hsl(var(--card-green))", fg: "hsl(var(--primary-dark))" },
      em_analise: { label: "Em análise", bg: "hsl(var(--card-yellow))", fg: "hsl(45 100% 35%)" },
      recusado: { label: "Recusado", bg: "hsl(var(--card-red))", fg: "hsl(var(--destructive))" },
      nao_solicitado: { label: "Não solicitado", bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" },
    } as const;
    return map[status];
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">


      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard
            title="Faturamento total"
            value={formatCurrency(stats?.faturamento_total)}
            subtitle={periodo.label}
          />
          <StatCard
            title="Faturamento de pedidos"
            value={formatCurrency(stats?.faturamento_pedidos)}
            subtitle={periodo.label}
          />
          <StatCard
            title="Faturamento de consultas"
            value={formatCurrency(stats?.faturamento_consultas)}
            subtitle={`${stats?.consultas_finalizadas ?? 0} consultas finalizadas`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard title="Receitas emitidas" value={stats?.receitas_emitidas ?? 0} subtitle={periodo.label} />
          <StatCard title="Pedidos realizados" value={stats?.pedidos_realizados ?? 0} subtitle={periodo.label} />
          <StatCard title="Produtos no catálogo" value={stats?.produtos_catalogo ?? 0} subtitle="total atual" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard title="Médicos ativos" value={stats?.medicos_ativos ?? 0} subtitle="total atual" />
          <StatCard title="Pacientes ativos" value={stats?.pacientes_ativos ?? 0} subtitle="total atual" />
          <StatCard title="Associações/marcas ativas" value={stats?.associacoes_ativas ?? 0} subtitle="total atual" />
        </div>

        {/* Feedbacks de consultas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Feedbacks de consultas</h2>
            <Link to="/feedbacks" className="text-sm font-medium text-primary hover:text-primary-dark">
              Ver tudo
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground mb-3">Nota média das consultas Canfy</p>
                <div className="flex items-center gap-3 mb-3">
                  <StarRating value={feedbacks?.media_geral ?? 0} />
                  <span className="text-2xl font-bold text-foreground">
                    {(feedbacks?.media_geral ?? 0).toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(feedbacks?.total ?? 0).toLocaleString("pt-BR")} avaliações totais.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Total de consultas com avaliações negativas
                </p>
                <p className="text-3xl font-bold text-foreground mb-3">
                  {feedbacks?.notas_baixas ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Consultas com nota abaixo de 3.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Receitas e pedidos ao longo do ano
          </h2>
          <div className="space-y-6">
            <FaturamentoBarsCard title="Faturamento mensal" data={faturamentoData} />
            <BarsCard title="Receitas emitidas" data={receitasData} />
            <BarsCard title="Pedidos realizados" data={pedidosData} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Últimas solicitações Anvisa</h2>
            {recentAnvisa.length === 0 ? (
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma solicitação Anvisa</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentAnvisa.map((item) => {
                  const tag = anvisaTag(item.status_anvisa);
                  return (
                    <Card key={item.id} className="rounded-[10px] bg-secondary border-none">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-normal mb-1">
                              Pedido #{item.numero_pedido}
                            </p>
                            <p className="font-semibold text-foreground">
                              Paciente {item.paciente_nome}
                            </p>
                          </div>
                          <Badge
                            style={{ backgroundColor: tag.bg, color: tag.fg }}
                            className="border-none rounded-full px-4 py-1 font-medium"
                          >
                            {tag.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Últimas solicitações de novos médicos
            </h2>
            {recentMedicos.length === 0 ? (
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentMedicos.map((medico) => (
                  <Card key={medico.id} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={medico.foto_perfil_url ?? undefined} />
                            <AvatarFallback className="bg-primary text-white font-medium text-sm">
                              {getInitials(medico.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{medico.nome}</p>
                            <p className="text-sm text-muted-foreground font-normal">{medico.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-foreground font-medium">
                          CRM {medico.crm}-{medico.uf_crm}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i <= rounded ? "fill-status-warning text-status-warning" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

function BarsCard({ title, data }: { title: string; data: MonthlyData[] }) {
  const chartData = data.map((d) => ({ month: d.month_name, value: Number(d.count) }));
  return (
    <Card className="rounded-[10px] bg-secondary border-none">
      <CardHeader>
        <CardTitle className="text-base font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i % 2 === 0 ? "hsl(var(--primary-hover))" : "hsl(var(--primary-dark))"}
                />
              ))}
              <LabelList
                dataKey="value"
                position="insideTop"
                style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function FaturamentoBarsCard({ title, data }: { title: string; data: MonthlyFaturamento[] }) {
  const chartData = data.map((d) => ({ month: d.month_name, value: Number(d.valor) }));
  const compactCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);
  return (
    <Card className="rounded-[10px] bg-secondary border-none">
      <CardHeader>
        <CardTitle className="text-base font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={compactCurrency}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i % 2 === 0 ? "hsl(var(--primary-hover))" : "hsl(var(--primary-dark))"}
                />
              ))}
              <LabelList
                dataKey="value"
                position="insideTop"
                formatter={(v: number) => compactCurrency(v)}
                style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
