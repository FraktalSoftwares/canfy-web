import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ReceitaDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  // Mock data
  const receita = {
    pedidoId: "#1234567",
    receitaId: "#1234567",
    emissao: "01/05/2025",
    paciente: "Ana Clara Silva",
    canal: "Associação",
    prescritor: "Claudio Fonseca",
    totalPago: "R$140,00",
    status: "Pedido na Anvisa",
    prazoEntrega: "Chega entre 10 e 12 de setembro",
    codigoRastreio: "0019860 0954614 46169 6966 0053593 1433737 0000010 0...",
    ultimaAtualizacao: "05/05/2025 • 13:20",
  };

  const timeline = [
    { label: "Validando documentos", completed: true },
    { label: "Liberando importação", completed: true },
    { label: "Importação liberada", completed: true },
    { label: "Pedido na Anvisa", completed: true },
    { label: "Pedido liberado pela Anvisa", completed: false },
    { label: "Pedido entregue", completed: false },
  ];

  const documentos = [
    "CNH.jpg",
    "comprovante_de_residencia.pdf",
  ];

  const handleCopyRastreio = () => {
    navigator.clipboard.writeText(receita.codigoRastreio);
    toast({
      title: "Código copiado com sucesso!",
      className: "bg-green-50 border-green-200",
    });
  };

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-normal"
            onClick={() => navigate("/receitas")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Receitas e pedidos &gt; Pedido {receita.pedidoId}
          </p>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground mb-8">Dados do pedido</h1>

        {/* Pedido Card */}
        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Pedido {receita.pedidoId}</h2>
              <Badge className="bg-blue-500 text-white hover:bg-blue-500 px-4 py-1">
                {receita.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Id da receita</p>
                <p className="font-semibold">{receita.receitaId}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Emissão da receita</p>
                <p className="font-semibold">{receita.emissao}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Paciente</p>
                <p className="font-semibold">{receita.paciente}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Canal de associação</p>
                <p className="font-semibold">{receita.canal}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Prescritor</p>
                <p className="font-semibold">{receita.prescritor}</p>
              </div>
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Total pago</p>
                <p className="font-semibold">{receita.totalPago}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Linha do tempo do pedido</h2>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <p className="text-sm font-semibold mb-6">{receita.prazoEntrega}</p>
              
              <div className="space-y-1">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      )}
                      {index < timeline.length - 1 && (
                        <div className={`w-0.5 h-8 ${item.completed ? 'bg-green-600' : 'bg-gray-300'}`} />
                      )}
                    </div>
                    <p className={`text-sm pt-0.5 ${item.completed ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rastreio */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Rastreio</h2>
          <Card className="rounded-[10px] bg-secondary border-none">
            <CardContent className="pt-6">
              <div className="bg-background rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Código de rastreio</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyRastreio}
                  >
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                </div>
                <p className="text-sm text-green-600 font-mono">{receita.codigoRastreio}</p>
              </div>
              
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">última atualização</p>
                <p className="font-semibold text-sm">{receita.ultimaAtualizacao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {documentos.map((doc, index) => (
                  <div key={index} className="bg-background rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-normal text-primary">{doc}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReceitaDetalhes;
