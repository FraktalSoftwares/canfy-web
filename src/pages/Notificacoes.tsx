import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Mail } from "lucide-react";

const Notificacoes = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState("Todos");

  const filters = [
    "Todos",
    "Financeiras",
    "Gestão de usuários",
    "Gestão de pedidos e receitas",
    "Catálogo, associações e marcas",
    "Alertas técnicos",
    "Engajamento e uso da plataforma",
    "Riscos e segurança",
    "Gerais",
  ];

  const notificacoesHoje = [
    {
      id: 1,
      titulo: "Existem 3 repasses com status atrasado.",
      descricao: "Acompanhe os pagamentos pendentes no módulo.",
      data: "23 Jul. 2025 • 16:15",
      lida: false,
      icon: "📄",
    },
    {
      id: 2,
      titulo: "10 novos pacientes se cadastraram nas últimas 24h.",
      descricao: "Veja a lista completa no painel de pacientes.",
      data: "23 Jul. 2025 • 16:15",
      lida: false,
      icon: "📄",
    },
    {
      id: 3,
      titulo: "Falha no sistema de emissão de receitas às 14h32.",
      descricao: "Nossa equipe técnica já foi acionada para corrigir.",
      data: "23 Jul. 2025 • 16:15",
      lida: false,
      icon: "📄",
    },
  ];

  const notificacoesOntem = [
    {
      id: 4,
      titulo: "Médicos com mais de 10 atendimentos esse mês: Dr. Ana, Dr. João.",
      descricao: "Confira os relatórios de atendimento no painel profissional.",
      data: "23 Jul. 2025 • 16:15",
      lida: true,
      icon: "📄",
    },
  ];

  const notificacoesAnteriores = [
    {
      id: 5,
      titulo: "Seu contrato com a API de pagamentos vence em 7 dias.",
      descricao: "Renove para manter a emissão de receitas sem interrupções.",
      data: "23 Jul. 2025 • 16:15",
      lida: true,
      icon: "📄",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <Button
            variant="outline"
            onClick={() => navigate("/notificacoes/personalizadas")}
            className="gap-2 border-green-600 text-green-600 hover:bg-green-50 rounded-full"
          >
            <Settings className="h-4 w-4" />
            Notificações personalizadas
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="mb-6 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="todas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-600 px-6 pb-3 font-semibold"
            >
              Todas
            </TabsTrigger>
            <TabsTrigger 
              value="nao-lidas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-green-600 px-6 pb-3 font-normal"
            >
              Não lidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todas" className="mt-0">
            {/* Filters */}
            <div className="mb-8">
              <p className="text-sm font-semibold mb-3">Tipo de notificações</p>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Badge
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`cursor-pointer px-4 py-2 rounded-full text-sm ${
                      selectedFilter === filter
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-white text-foreground border border-border hover:bg-gray-50'
                    }`}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notificações de Hoje */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground mb-4">HOJE</p>
              <div className="space-y-4">
                {notificacoesHoje.map((notif) => (
                  <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center relative">
                            <Mail className="h-6 w-6 text-purple-600" />
                            {!notif.lida && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold mb-1">{notif.titulo}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{notif.descricao}</p>
                          <p className="text-xs text-muted-foreground mb-3">{notif.data}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-full border-green-600 text-green-600 hover:bg-green-50"
                            >
                              Ver detalhes
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-9 text-green-600 hover:text-green-700"
                            >
                              Marcar como lida
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notificações de Ontem */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground mb-4">ONTEM</p>
              <div className="space-y-4">
                {notificacoesOntem.map((notif) => (
                  <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold mb-1">{notif.titulo}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{notif.descricao}</p>
                          <p className="text-xs text-muted-foreground mb-3">{notif.data}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full border-green-600 text-green-600 hover:bg-green-50"
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notificações Anteriores */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground mb-4">18 JUL., 2025</p>
              <div className="space-y-4">
                {notificacoesAnteriores.map((notif) => (
                  <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold mb-1">{notif.titulo}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{notif.descricao}</p>
                          <p className="text-xs text-muted-foreground mb-3">{notif.data}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full border-green-600 text-green-600 hover:bg-green-50"
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="nao-lidas">
            <div className="space-y-4">
              {notificacoesHoje.filter(n => !n.lida).map((notif) => (
                <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center relative">
                          <Mail className="h-6 w-6 text-purple-600" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold mb-1">{notif.titulo}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{notif.descricao}</p>
                        <p className="text-xs text-muted-foreground mb-3">{notif.data}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full border-green-600 text-green-600 hover:bg-green-50"
                          >
                            Ver detalhes
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-9 text-green-600 hover:text-green-700"
                          >
                            Marcar como lida
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notificacoes;
