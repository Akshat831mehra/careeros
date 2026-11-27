import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand-soft text-brand",
  blue: "bg-info-soft text-info",
  amber: "bg-warning-soft text-warning",
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  neutral: "bg-surface-hover text-muted-strong",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <Card className="group relative overflow-hidden p-3.5 transition-colors hover:border-border-strong/70">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="h-3 w-3" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2.5 text-[23px] font-semibold leading-none tracking-[-0.045em] text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[10px] leading-tight text-muted">{sub}</p>
    </Card>
  );
}
