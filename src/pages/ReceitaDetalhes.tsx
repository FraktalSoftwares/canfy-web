import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Pill, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getReceitaStatusBadge } from "@/lib/pedidoStatus";

interface ReceitaDetalhe {
  id: string;
  numero_receita: string;
  data_emissao: string | null;
  validade: string | null;
  status: string;
  observacoes: string | null;
  documento_url: string | null;
  paciente_id: string;
  paciente_nome: string;
  medico_nome: string | null;
  medico_crm: string | null;
}

interface ReceitaItem {
  item_id: string;
  produto_id: string;
  produto_nome: string;
  imagem_url: string | null;
  forma_farmaceutica: string | null;
  concentracao_thc: string | null;
  concentracao_cbd: string | null;
  posologia: string | null;
  quantidade_prescrita: number | null;
  duracao_tratamento: string | null;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

const ReceitaDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [receita, setReceita] = useState<ReceitaDetalhe | null>(null);
  const [itens, setItens] = useState<ReceitaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchReceita = async () => {
      setIsLoading(true);
      try {
        const [{ data: detalhe, error: errDetalhe }, { data: itensData, error: errItens }] =
          await Promise.all([
            (supabase.rpc as any)("admin_get_receita_detalhes", { p_id: id }),
            (supabase.rpc as any)("admin_get_receita_itens", { p_receita_id: id }),
          ]);
        if (errDetalhe) throw errDetalhe;
        if (errItens) throw errItens;
        setReceita((detalhe && detalhe[0]) || null);
        setItens(itensData || []);
      } catch (error: any) {
        console.error("Erro ao carregar receita:", error);
        toast({
          title: "Erro ao carregar receita",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchReceita();
  }, [id, toast]);

  const statusBadge = receita ? getReceitaStatusBadge(receita.status) : null;

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
            Receitas e pedidos &gt; Receita {receita ? receita.numero_receita : ""}
          </p>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-8">Dados da receita</h1>

        {isLoading ? (
          <p className="text-muted-foreground py-8">Carregando receita...</p>
        ) : !receita ? (
          <p className="text-muted-foreground py-8">Receita não encontrada.</p>
        ) : (
          <>
            {/* Receita Card */}
            <Card className="rounded-[10px] bg-secondary border-none mb-8">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Receita {receita.numero_receita}</h2>
                  {statusBadge && (
                    <Badge
                      style={{ backgroundColor: statusBadge.bg, color: statusBadge.fg }}
                      className="border-none rounded-full px-4 py-1 font-medium hover:opacity-90"
                    >
                      {statusBadge.label}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Nº da receita</p>
                    <p className="font-semibold">{receita.numero_receita}</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Emissão</p>
                    <p className="font-semibold">{formatDate(receita.data_emissao)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Validade</p>
                    <p className="font-semibold">{formatDate(receita.validade)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Paciente</p>
                    <p className="font-semibold">{receita.paciente_nome}</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Prescritor</p>
                    <p className="font-semibold">{receita.medico_nome || "—"}</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">CRM</p>
                    <p className="font-semibold">{receita.medico_crm || "—"}</p>
                  </div>
                </div>

                {receita.observacoes && (
                  <div className="bg-background rounded-lg p-4 mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Observações</p>
                    <p className="text-sm">{receita.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Itens prescritos */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Itens prescritos</h2>
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="pt-6 space-y-4">
                  {itens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum item prescrito nesta receita.
                    </p>
                  ) : (
                    itens.map((item) => (
                      <div key={item.item_id} className="bg-background rounded-lg p-4 flex gap-4">
                        <div className="h-16 w-16 rounded-lg bg-card-green flex items-center justify-center overflow-hidden shrink-0">
                          {item.imagem_url ? (
                            <img
                              src={item.imagem_url}
                              alt={item.produto_nome}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Pill className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{item.produto_nome}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {[
                              item.forma_farmaceutica,
                              item.concentracao_thc ? `THC ${item.concentracao_thc}` : null,
                              item.concentracao_cbd ? `CBD ${item.concentracao_cbd}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-xs text-muted-foreground">Quantidade</span>
                              <p className="font-medium">{item.quantidade_prescrita ?? "—"}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Duração</span>
                              <p className="font-medium">{item.duracao_tratamento || "—"}</p>
                            </div>
                            <div className="col-span-1">
                              <span className="text-xs text-muted-foreground">Posologia</span>
                              <p className="font-medium">{item.posologia || "—"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Documento da receita */}
            {receita.documento_url && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Documento</h2>
                <Card className="rounded-[10px] bg-secondary border-none">
                  <CardContent className="pt-6">
                    <a
                      href={receita.documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-background rounded-lg p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm font-normal text-primary">
                          Documento da receita
                        </span>
                      </div>
                      <Download className="h-4 w-4 text-primary" />
                    </a>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReceitaDetalhes;
