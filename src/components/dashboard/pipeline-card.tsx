import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function PipelineCard({ data }: { data: DashboardData }) {
  const total = data.stats.applications;
  const maxWeek = Math.max(...data.weeklyActivity.map((week) => week.count), 1);
  const submitted = data.weeklyActivity.reduce((sum, week) => sum + week.count, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-0">
        <div>
          <CardTitle>Application pipeline</CardTitle>
          <p className="mt-1 text-[11px] text-muted">
            {total} {total === 1 ? "opportunity" : "opportunities"} across {data.pipeline.filter((group) => group.count > 0).length} stages
          </p>
        </div>
        <Link
          href="/applications"
          className="flex items-center gap-1 text-[10.5px] font-medium text-muted transition-colors hover:text-foreground"
        >
          View all
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-5">
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-[12px] font-medium text-foreground">No applications yet</p>
            <p className="max-w-[220px] text-[11px] leading-relaxed text-muted">
              Add your first opportunity and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full">
              {data.pipeline.map((group) =>
                group.count > 0 ? (
                  <div
                    key={group.key}
                    title={`${group.label}: ${group.count}`}
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${group.percentage}%`, background: group.color }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
              {data.pipeline.map((group) => (
                <div key={group.key} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: group.color }}
                  />
                  <span className="flex-1 truncate text-[11px] text-muted-strong">{group.label}</span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground">{group.count}</span>
                  <span className="w-7 text-right text-[9.5px] tabular-nums text-muted">
                    {group.percentage}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto border-t border-border pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                    Application momentum
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    <span className="font-medium text-foreground">{submitted} submitted</span> over the last 7 weeks
                  </p>
                </div>
                <div className="flex h-12 items-end gap-1.5">
                  {data.weeklyActivity.map((week, index) => (
                    <div key={index} className="group/bar flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-3.5 rounded-sm transition-colors",
                          index === data.weeklyActivity.length - 1 ? "bg-brand" : "bg-brand/20 group-hover/bar:bg-brand/35",
                        )}
                        style={{ height: `${Math.max(5, (week.count / maxWeek) * 40)}px` }}
                        title={`${week.count} applications`}
                      />
                      <span className="text-[7.5px] text-muted/70">{week.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
