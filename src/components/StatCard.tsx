import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number;
  variant?: 'green' | 'yellow' | 'blue' | 'pink' | 'orange' | 'purple' | 'teal' | 'red';
}

const StatCard = ({ title, value }: StatCardProps) => {
  return (
    <Card className="bg-secondary rounded-[10px] border-none">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground font-normal mb-1">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
};

export default StatCard;
