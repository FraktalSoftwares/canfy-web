import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, MoreVertical, X } from "lucide-react";

const NotificacoesPersonalizadas = () => {
  const navigate = useNavigate();
  const [novaNotificacaoOpen, setNovaNotificacaoOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [tipoEnvio, setTipoEnvio] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const notificacoes = [
    {
      id: 1,
      status: "Enviada",
      statusColor: "bg-green-100 text-green-700",
      data: "01/09/25 • 09:30",
      titulo: "Consulta agendada para amanhã!",
      descricao: "Sua consulta na Canfy é amanhã às 15h. Acesso o app para mais detalhes.",
      destinatario: "Paciente João Carlos Fonseca",
    },
    {
      id: 2,
      status: "Agendada",
      statusColor: "bg-blue-100 text-blue-700",
      data: "05/09/25 • 14:00",
      titulo: "Atualização do cadastro de pacientes",
      descricao: "Lembre-se de revisar o cadastro de pacientes no sistema.",
      destinatario: "Todos os médicos",
    },
    {
      id: 3,
      status: "Agendada",
      statusColor: "bg-blue-100 text-blue-700",
      data: "05/09/25 • 14:00",
      titulo: "Atualização do cadastro de pacientes",
      descricao: "Lembre-se de revisar o cadastro de pacientes no sistema.",
      destinatario: "Todos os médicos",
    },
    {
      id: 4,
      status: "Enviada",
      statusColor: "bg-green-100 text-green-700",
      data: "01/09/25 • 09:30",
      titulo: "Consulta agendada para amanhã!",
      descricao: "Sua consulta na Canfy é amanhã às 15h. Acesso o app para mais detalhes.",
      destinatario: "Paciente João Carlos Fonseca",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Header */}
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
            className="gap-2 bg-white text-green-600 border border-green-600 hover:bg-green-50 rounded-full"
          >
            <Plus className="h-4 w-4" />
            Nova notificação
          </Button>
        </div>

        {/* Modal Nova Notificação */}
        <Dialog open={novaNotificacaoOpen} onOpenChange={setNovaNotificacaoOpen}>
          <DialogContent className="max-w-md [&>button]:hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold mb-1">Cadastrar nova notificação</DialogTitle>
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
                <Label htmlFor="observacoes">Observações</Label>
                <div className="relative">
                  <Textarea
                    id="observacoes"
                    placeholder="Ex.: Sua consulta está marcada para amanhã às 15h."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value.slice(0, 100))}
                    maxLength={100}
                    className="min-h-[80px] resize-none"
                  />
                  <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                    {observacoes.length}/100
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatario">Destinatário</Label>
                <Select value={destinatario} onValueChange={setDestinatario}>
                  <SelectTrigger id="destinatario">
                    <SelectValue placeholder="Selecione os destinatários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos-pacientes">Todos os pacientes</SelectItem>
                    <SelectItem value="todos-medicos">Todos os médicos</SelectItem>
                    <SelectItem value="paciente-especifico">Paciente específico</SelectItem>
                    <SelectItem value="medico-especifico">Médico específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo-envio">Tipo de envio</Label>
                <Select value={tipoEnvio} onValueChange={setTipoEnvio}>
                  <SelectTrigger id="tipo-envio">
                    <SelectValue placeholder="Selecione o tipo de envio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediato">Envio imediato</SelectItem>
                    <SelectItem value="agendado">Envio agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="text"
                  placeholder="hh:mm (24h)"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setNovaNotificacaoOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    // Lógica para salvar notificação
                    setNovaNotificacaoOpen(false);
                    setTitulo("");
                    setObservacoes("");
                    setDestinatario("");
                    setTipoEnvio("");
                    setData("");
                    setHora("");
                  }}
                >
                  Salvar notificação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Breadcrumb */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Notificações <span className="mx-1">›</span>{" "}
            <span className="text-foreground font-semibold">Notificações personalizadas</span>
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Notificações <span className="mx-1">›</span>{" "}
            <span className="text-foreground font-semibold">Notificações personalizadas</span>
          </p>
        </div>

        {/* Lista de Notificações */}
        <div className="space-y-4">
          {notificacoes.map((notif) => (
            <Card key={notif.id} className="rounded-[10px] bg-secondary border-none">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`${notif.statusColor} px-3 py-1 rounded-md font-medium`}>
                        {notif.status}
                      </Badge>
                      <span className="text-sm text-foreground">{notif.data}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Conteúdo */}
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
                      <span className="text-sm text-muted-foreground">{notif.destinatario}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificacoesPersonalizadas;
