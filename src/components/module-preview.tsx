import Link from "next/link";
import { ArrowLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
  badgeVariant?: BadgeProps["variant"];
  initials?: string;
  accent?: "brand" | "blue" | "amber" | "green" | "red" | "neutral";
};

const accents = {
  brand: "bg-brand-soft text-brand",
  blue: "bg-info-soft text-info",
  amber: "bg-warning-soft text-warning",
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  neutral: "bg-surface-hover text-muted-strong",
};

export function ModulePreview({
  title,
  description,
  icon: Icon,
  stats,
  items,
  emptyTitle,
  emptyDescription,
  listTitle,
  phase = "Next",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: { label: string; value: string | number; sub?: string }[];
  items: PreviewItem[];
  emptyTitle: string;
  emptyDescription: string;
  listTitle: string;
  phase?: string;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface shadow-card">
            <Icon className="h-4.5 w-4.5 text-brand" strokeWidth={1.8} />
          </span>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
              <Badge variant="outline" className="text-[9px]">
                Preview
              </Badge>
            </div>
            <p className="max-w-[520px] text-[12px] leading-relaxed text-muted">{description}</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] font-medium text-muted-strong shadow-sm transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">{stat.label}</p>
            <p className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
              {stat.value}
            </p>
            {stat.sub && <p className="mt-1.5 text-[10px] text-muted">{stat.sub}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle>{listTitle}</CardTitle>
          <span className="text-[10px] tabular-nums text-muted">{items.length} records</span>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Icon className="h-5 w-5 text-muted" />
              <p className="text-[12px] font-medium text-foreground">{emptyTitle}</p>
              <p className="max-w-[280px] text-[11px] leading-relaxed text-muted">{emptyDescription}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/50">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold",
                      accents[item.accent ?? "neutral"],
                    )}
                  >
                    {item.initials ?? item.title.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">{item.subtitle}</p>
                  </div>
                  <span className="hidden max-w-[180px] truncate text-[10px] text-muted sm:block">{item.meta}</span>
                  {item.badge && <Badge variant={item.badgeVariant ?? "default"}>{item.badge}</Badge>}
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-muted/40" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-border-strong bg-surface-muted/40 px-5 py-4 sm:flex-row">
        <div>
          <p className="text-[11.5px] font-medium text-foreground">The full {title.toLowerCase()} module is next.</p>
          <p className="mt-0.5 text-[10.5px] text-muted">
            This read-only preview confirms your data is connected. Create, edit, filter and detail views come in the next build phase.
          </p>
        </div>
        <Badge variant="brand" className="shrink-0">
          {phase}
        </Badge>
      </div>
    </div>
  );
}
