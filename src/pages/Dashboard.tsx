import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface DashboardStats {
  total_pacientes_ativos: number;
  total_consultas: number;
  total_pedidos_ativos: number;
  total_pedidos_concluidos: number;
  total_medicos_ativos: number;
  total_pedidos_cancelados: number;
}

interface MonthlyData {
  month: number;
  month_name: string;
  count: number;
}

interface RecentPedido {
  id: string;
  numero_pedido: string;
  paciente_nome: string;
  status: string;
  data_pedido: string;
}

interface RecentMedico {
  id: string;
  nome: string;
  email: string;
  crm: string;
  uf_crm: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState(2024);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [receitasData, setReceitasData] = useState<MonthlyData[]>([]);
  const [pedidosData, setPedidosData] = useState<MonthlyData[]>([]);
  const [recentPedidos, setRecentPedidos] = useState<RecentPedido[]>([]);
  const [recentMedicos, setRecentMedicos] = useState<RecentMedico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase.rpc('admin_get_dashboard_stats');
      
      if (statsError) {
        // Check if it's an authorization error
        if (statsError.message.includes('not authorized')) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar o dashboard. Entre em contato com o administrador.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw statsError;
      }
      
      if (statsData && statsData.length > 0) setStats(statsData[0]);

      // Fetch monthly receitas
      const { data: receitasMonthly, error: receitasError } = await supabase.rpc('admin_get_monthly_receitas', { p_year: currentYear });
      if (receitasError && !receitasError.message.includes('not authorized')) throw receitasError;
      setReceitasData(receitasMonthly || []);

      // Fetch monthly pedidos
      const { data: pedidosMonthly, error: pedidosError } = await supabase.rpc('admin_get_monthly_pedidos', { p_year: currentYear });
      if (pedidosError && !pedidosError.message.includes('not authorized')) throw pedidosError;
      setPedidosData(pedidosMonthly || []);

      // Fetch recent pedidos
      const { data: pedidos, error: pedidosRecentError } = await supabase.rpc('admin_get_recent_pedidos', { p_limit: 5 });
      if (pedidosRecentError && !pedidosRecentError.message.includes('not authorized')) throw pedidosRecentError;
      setRecentPedidos(pedidos || []);

      // Fetch recent medicos
      const { data: medicos, error: medicosError } = await supabase.rpc('admin_get_recent_medicos', { p_limit: 5 });
      if (medicosError && !medicosError.message.includes('not authorized')) throw medicosError;
      setRecentMedicos(medicos || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro ao carregar dashboard",
        description: error.message || "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { bgColor: string; textColor: string; label: string }> = {
      'entregue': { bgColor: "hsl(122 39% 49% / 0.15)", textColor: "hsl(122 39% 49%)", label: "Finalizado" },
      'pendente': { bgColor: "hsl(4 90% 58% / 0.15)", textColor: "hsl(4 90% 58%)", label: "Pendente" },
      'aprovado': { bgColor: "hsl(45 100% 51% / 0.15)", textColor: "hsl(45 100% 51%)", label: "Em pedido" },
      'em_analise': { bgColor: "hsl(45 100% 51% / 0.15)", textColor: "hsl(45 100% 51%)", label: "Em análise" },
      'em_separacao': { bgColor: "hsl(45 100% 51% / 0.15)", textColor: "hsl(45 100% 51%)", label: "Em separação" },
      'enviado': { bgColor: "hsl(200 80% 50% / 0.15)", textColor: "hsl(200 80% 50%)", label: "Enviado" },
    };
    return statusMap[status] || { bgColor: "hsl(0 0% 50% / 0.15)", textColor: "hsl(0 0% 50%)", label: status };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentYear(prev => prev - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="bg-card-green px-6 py-2 rounded-full">
              <span className="text-sm font-medium text-primary">{currentYear}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentYear(prev => prev + 1)}
              disabled={currentYear >= new Date().getFullYear()}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard title="Pacientes ativos" value={stats?.total_pacientes_ativos || 0} />
          <StatCard title="Consultas realizadas" value={stats?.total_consultas || 0} />
          <StatCard title="Pedidos ativos" value={stats?.total_pedidos_ativos || 0} />
          <StatCard title="Pedidos concluídos" value={stats?.total_pedidos_concluidos || 0} />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard title="Médicos ativos" value={stats?.total_medicos_ativos || 0} />
          <StatCard title="Pacientes ativos" value={stats?.total_pacientes_ativos || 0} />
          <StatCard title="Pedidos cancelados" value={stats?.total_pedidos_cancelados || 0} />
          <StatCard title="Compromissos por status" value={8} />
        </div>

        {/* Charts */}
        <div className="space-y-6 mb-6">
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardHeader>
              <CardTitle className="text-base font-normal text-muted-foreground">Receitas emitidas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={receitasData.map(d => ({ month: d.month_name, value: Number(d.count) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      style={{ fill: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-[10px] bg-secondary border-none">
            <CardHeader>
              <CardTitle className="text-base font-normal text-muted-foreground">Pedidos realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pedidosData.map(d => ({ month: d.month_name, value: Number(d.count) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary-dark))" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      style={{ fill: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Lists */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Últimas solicitações feitas</h2>
            {recentPedidos.length === 0 ? (
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentPedidos.map((item) => {
                  const statusConfig = getStatusConfig(item.status);
                  return (
                    <Card key={item.id} className="rounded-[10px] bg-secondary border-none">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-normal mb-1">{item.numero_pedido}</p>
                            <p className="font-semibold text-foreground">Paciente {item.paciente_nome}</p>
                          </div>
                          <Badge 
                            style={{ 
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.textColor,
                            }}
                            className="border-none rounded-full px-4 py-1 font-medium"
                          >
                            {statusConfig.label}
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
            <h2 className="text-lg font-semibold text-foreground mb-4">Últimas solicitações de novos médicos</h2>
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
                            <AvatarFallback className="bg-primary text-white font-medium text-sm">
                              {medico.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{medico.nome}</p>
                            <p className="text-sm text-muted-foreground font-normal">{medico.email}</p>
                          </div>
                        </div>
                        <p className="text-sm text-foreground font-medium">CRM {medico.crm}-{medico.uf_crm}</p>
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

export default Dashboard;
