import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Check, X, Plus, Calendar, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ConfigSistema = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [percentualComissao, setPercentualComissao] = useState("5.00");
  const [valorConsulta, setValorConsulta] = useState("99.90");
  const [taxaPedido, setTaxaPedido] = useState("0.00");
  const [freteIntl, setFreteIntl] = useState("0.00");
  const [prazoIntl, setPrazoIntl] = useState("30");
  const [feriados, setFeriados] = useState<string[]>([]);
  const [novoFeriado, setNovoFeriado] = useState("");

  const [meCepOrigem, setMeCepOrigem] = useState("65901110");
  const [meSandbox, setMeSandbox] = useState(true);
  const [meRemetenteNome, setMeRemetenteNome] = useState("");
  const [meRemetenteDoc, setMeRemetenteDoc] = useState("");
  const [meRemetenteEmail, setMeRemetenteEmail] = useState("");
  const [meRemetenteTel, setMeRemetenteTel] = useState("");
  const [meRemetenteCnpj, setMeRemetenteCnpj] = useState("");

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase.rpc("admin_get_configuracoes_sistema");
      if (error) throw error;
      if (data && data.length > 0) {
        const c = data[0];
        setPercentualComissao(String(c.percentual_comissao_medico));
        setValorConsulta(String(c.valor_consulta_padrao));
        setTaxaPedido(String(c.taxa_pedido));
        setFreteIntl(String(c.frete_internacional));
        setPrazoIntl(String(c.prazo_entrega_internacional_dias));
        setFeriados((c.feriados as string[]) || []);
        setMeCepOrigem(c.melhor_envio_cep_origem ?? "65901110");
        setMeSandbox(c.melhor_envio_sandbox ?? true);
        const rem = (c.melhor_envio_remetente as Record<string, string> | null) ?? {};
        setMeRemetenteNome(rem.nome ?? "");
        setMeRemetenteDoc(rem.document ?? "");
        setMeRemetenteEmail(rem.email ?? "");
        setMeRemetenteTel(rem.phone ?? "");
        setMeRemetenteCnpj(rem.company_document ?? "");
      }
    } catch (e: any) {
      toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const remetente: Record<string, string> = {
        nome: meRemetenteNome.trim(),
        document: meRemetenteDoc.trim(),
        email: meRemetenteEmail.trim(),
        phone: meRemetenteTel.trim(),
      };
      if (meRemetenteCnpj.trim()) remetente.company_document = meRemetenteCnpj.trim();

      const { error } = await supabase.rpc("admin_update_configuracoes_sistema", {
        p_percentual_comissao: Number(percentualComissao),
        p_valor_consulta: Number(valorConsulta),
        p_taxa_pedido: Number(taxaPedido),
        p_frete_intl: Number(freteIntl),
        p_prazo_intl: Number(prazoIntl),
        p_feriados: feriados,
        p_me_cep_origem: meCepOrigem.trim(),
        p_me_sandbox: meSandbox,
        p_me_remetente: remetente,
      });
      if (error) throw error;
      toast({ title: "Configurações salvas" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addFeriado = () => {
    if (!novoFeriado || feriados.includes(novoFeriado)) return;
    setFeriados([...feriados, novoFeriado].sort());
    setNovoFeriado("");
  };

  const removeFeriado = (d: string) => setFeriados(feriados.filter((x) => x !== d));

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


      <div className="px-6 py-8 max-w-[960px] mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-card-green/40 mb-3 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Configurações do sistema</h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-full"
          >
            <Check className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-3">Regras financeiras</h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-6">
          <CardContent className="grid grid-cols-2 gap-5 px-6 py-6">
            <Field label="% Comissão médico" value={percentualComissao} onChange={setPercentualComissao} suffix="%" />
            <Field label="Valor consulta padrão" value={valorConsulta} onChange={setValorConsulta} prefix="R$" />
            <Field label="Taxa pedido" value={taxaPedido} onChange={setTaxaPedido} prefix="R$" />
            <Field label="Frete internacional" value={freteIntl} onChange={setFreteIntl} prefix="US$" />
            <Field label="Prazo entrega internacional (dias)" value={prazoIntl} onChange={setPrazoIntl} suffix="dias" />
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Melhor Envio (frete nacional)
        </h2>
        <Card className="rounded-[10px] bg-secondary border-none mb-6">
          <CardContent className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <TextField label="CEP origem" value={meCepOrigem} onChange={setMeCepOrigem} placeholder="00000000" />
              <div className="flex items-center justify-between bg-background border border-border rounded-md px-4 h-10">
                <label className="text-sm text-foreground">Modo sandbox</label>
                <Switch checked={meSandbox} onCheckedChange={setMeSandbox} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Remetente (exigido pela API ME)</h3>
              <div className="grid grid-cols-2 gap-5">
                <TextField label="Nome" value={meRemetenteNome} onChange={setMeRemetenteNome} />
                <TextField label="CPF" value={meRemetenteDoc} onChange={setMeRemetenteDoc} />
                <TextField label="Email" value={meRemetenteEmail} onChange={setMeRemetenteEmail} />
                <TextField label="Telefone" value={meRemetenteTel} onChange={setMeRemetenteTel} />
                <TextField label="CNPJ (opcional)" value={meRemetenteCnpj} onChange={setMeRemetenteCnpj} />
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-foreground mb-3">Feriados bloqueados</h2>
        <Card className="rounded-[10px] bg-secondary border-none">
          <CardContent className="px-6 py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Datas listadas serão bloqueadas para agendamento de consultas.
            </p>
            <div className="flex gap-2 mb-4">
              <Input
                type="date"
                value={novoFeriado}
                onChange={(e) => setNovoFeriado(e.target.value)}
                className="h-10 bg-background border-border max-w-[220px]"
              />
              <Button
                onClick={addFeriado}
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {feriados.length === 0 ? (
                <p className="text-muted-foreground italic text-sm">Nenhum feriado cadastrado.</p>
              ) : (
                feriados.map((d) => (
                  <Badge
                    key={d}
                    className="border-none rounded-full px-3 py-1.5 gap-2 bg-card-green text-primary-dark hover:bg-card-green"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(d + "T00:00:00"), "dd 'de' MMMM yyyy", { locale: ptBR })}
                    <button onClick={() => removeFeriado(d)} className="ml-1 hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function Field({
  label, value, onChange, prefix, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-background border-border h-10 ${prefix ? "pl-10" : ""} ${suffix ? "pr-14" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function TextField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background border-border h-10"
      />
    </div>
  );
}

export default ConfigSistema;
