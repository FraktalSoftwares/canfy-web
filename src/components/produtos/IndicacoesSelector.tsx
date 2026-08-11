import { Badge } from "@/components/ui/badge";

export interface Indicacao {
  id: string;
  nome: string;
}

interface IndicacoesSelectorProps {
  indicacoes: Indicacao[];
  selected: string[];
  onToggle: (indicacaoId: string) => void;
}

export const IndicacoesSelector = ({ indicacoes, selected, onToggle }: IndicacoesSelectorProps) => {
  if (indicacoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma indicação clínica cadastrada.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {indicacoes.map((indicacao) => (
        <Badge
          key={indicacao.id}
          onClick={() => onToggle(indicacao.id)}
          className={`cursor-pointer px-4 py-2 rounded-full ${
            selected.includes(indicacao.id)
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "bg-card text-foreground border border-border hover:bg-muted"
          }`}
        >
          {indicacao.nome}
        </Badge>
      ))}
    </div>
  );
};
