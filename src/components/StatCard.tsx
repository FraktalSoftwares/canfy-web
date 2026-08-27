import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'green' | 'yellow' | 'blue' | 'pink' | 'orange' | 'purple' | 'teal' | 'red';
}

const StatCard = ({ title, value, subtitle }: StatCardProps) => {
  return (
    <Card className="bg-secondary rounded-[10px] border-none">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground font-normal mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
