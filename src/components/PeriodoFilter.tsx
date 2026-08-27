import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export interface Periodo {
  from: Date;
  to: Date;
  label: string;
}

interface PeriodoFilterProps {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

export const periodoMesAtual = (): Periodo => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from, to, label: "Mês" };
};

const periodoSemana = (): Periodo => {
  const to = addDays(startOfDay(new Date()), 1);
  const from = addDays(to, -7);
  return { from, to, label: "Semana" };
};

const periodoQuinzena = (): Periodo => {
  const to = addDays(startOfDay(new Date()), 1);
  const from = addDays(to, -15);
  return { from, to, label: "15 dias" };
};

const periodoMes = (): Periodo => ({ ...periodoMesAtual(), label: "Mês" });

const periodoCustom = (range: DateRange): Periodo | null => {
  if (!range.from || !range.to) return null;
  const from = startOfDay(range.from);
  const to = addDays(startOfDay(range.to), 1);
  const label = `${format(range.from, "dd/MM", { locale: ptBR })} – ${format(range.to, "dd/MM", { locale: ptBR })}`;
  return { from, to, label };
};

const PRESETS: { key: string; label: string; build: () => Periodo }[] = [
  { key: "semana", label: "Semana", build: periodoSemana },
  { key: "15dias", label: "15 dias", build: periodoQuinzena },
  { key: "mes", label: "Mês", build: periodoMes },
];

export function PeriodoFilter({ value, onChange }: PeriodoFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>({ from: value.from, to: addDays(value.to, -1) });
  const isCustom = !PRESETS.some((p) => p.label === value.label);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          variant="ghost"
          size="sm"
          onClick={() => onChange(preset.build())}
          className={cn(
            "rounded-full px-4 h-9 font-semibold",
            value.label === preset.label
              ? "bg-card-green text-primary hover:bg-card-green/80"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full px-4 h-9 font-semibold gap-2",
              isCustom
                ? "bg-card-green text-primary hover:bg-card-green/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            {isCustom ? value.label : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            locale={ptBR}
            selected={draftRange}
            onSelect={setDraftRange}
            defaultMonth={draftRange?.from}
            className="p-3"
          />
          <div className="flex justify-end gap-2 p-3 pt-0">
            <Button
              size="sm"
              onClick={() => {
                const periodo = periodoCustom(draftRange ?? {});
                if (!periodo) return;
                onChange(periodo);
                setOpen(false);
              }}
              disabled={!draftRange?.from || !draftRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
