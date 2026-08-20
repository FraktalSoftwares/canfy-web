import { Input } from "@/components/ui/input";

/**
 * Campo que alterna entre leitura (texto em negrito) e edição (Input pill).
 *
 * Extraído de PacienteDetalhes/MedicoDetalhes, onde existia duplicado, para que
 * as máscaras de CPF/telefone fiquem em um único lugar.
 *
 * `mask` recebe o valor digitado e devolve o valor formatado — as funções em
 * `@/lib/masks` são idempotentes e podem ser passadas diretamente.
 */
export function EditableField({
  label, value, editing, onChange, editValue, type, mask, maxLength, placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  editValue: string;
  type?: string;
  mask?: (v: string) => string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className={editing ? "" : "border-b border-border/40 pb-3 last:border-b-0"}>
      <p className={`text-xs mb-1 ${editing ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</p>
      {editing ? (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => onChange(mask ? mask(e.target.value) : e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          inputMode={mask ? "numeric" : undefined}
          className="h-9 bg-background border-border rounded-full px-4"
        />
      ) : (
        <p className="text-base font-bold text-foreground break-words">{value}</p>
      )}
    </div>
  );
}

export default EditableField;
