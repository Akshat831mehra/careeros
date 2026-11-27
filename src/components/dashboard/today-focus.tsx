import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  ListChecks,
  Mail,
  TriangleAlert,
} from "lucide-react";
import { isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard";
import { cn, formatTime } from "@/lib/utils";

type FocusItem = {
  id: string;
  title: string;
  meta: string;
  time: string;
  href: string;
  kind: "event" | "task";
  overdue: boolean;
  interview: boolean;
  followUp: boolean;
};

export function TodayFocus({ data }: { data: DashboardData }) {
  const todayStart = startOfDay(data.now);
  const eventItems: FocusItem[] = data.today.events.map((event) => ({
    id: `event-${event.id}`,
    title: event.title,
    meta: event.company?.name ?? event.contact?.fullName ?? "No company",
    time: formatTime(event.startAt),
    href: "/calendar",
    kind: "event",
    overdue: isBefore(event.startAt, todayStart),
    interview: event.type === "INTERVIEW",
    followUp: event.type === "HR_FOLLOW_UP" || event.type === "RECRUITER_FOLLOW_UP",
  }));

  const taskItems: FocusItem[] = data.today.tasks.map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    meta: task.company?.name ?? task.contact?.fullName ?? "Personal task",
    time: "Due today",
    href: "/tasks",
    kind: "task",
    overdue: false,
    interview: false,
    followUp: false,
  }));

  const overdueItems: FocusItem[] = [
    ...data.today.overdue.map((event) => ({
      id: `overdue-event-${event.id}`,
      title: event.title,
      meta: event.company?.name ?? "Overdue follow-up",
      time: "Overdue",
      href: "/calendar",
      kind: "event" as const,
      overdue: true,
      interview: false,
      followUp: true,
    })),
    ...data.overdueTasks.map((task) => ({
      id: `overdue-task-${task.id}`,
      title: task.title,
      meta: task.company?.name ?? "Overdue task",
      time: "Overdue",
      href: "/tasks",
      kind: "task" as const,
      overdue: true,
      interview: false,
      followUp: false,
    })),
  ];

  const items = [...overdueItems, ...eventItems, ...taskItems].slice(0, 6);
  const pendingCount = data.today.events.length + data.today.tasks.length + overdueItems.length;
  const progress = pendingCount
    ? Math.min(100, Math.round((data.focusProgress.completed / (pendingCount + data.focusProgress.completed)) * 100))
    : 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-0">
        <div>
          <CardTitle>Today&apos;s focus</CardTitle>
          <p className="mt-1 text-[11px] text-muted">
            {pendingCount === 0 ? "A clear day ahead." : `${pendingCount} ${pendingCount === 1 ? "item" : "items"} need you`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {overdueItems.length > 0 && (
            <span className="flex items-center gap-1 rounded-md border border-danger/15 bg-danger-soft px-1.5 py-0.5 text-[9.5px] font-medium text-danger">
              <TriangleAlert className="h-2.5 w-2.5" />
              {overdueItems.length} overdue
            </span>
          )}
          <span className="text-[9.5px] tabular-nums text-muted">{progress}%</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-4">
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-[12px] font-medium text-foreground">Nothing due today</p>
            <p className="max-w-[200px] text-[11px] leading-relaxed text-muted">
              Use the space to prepare for what&apos;s next.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.kind === "task" ? ListChecks : item.interview ? CalendarClock : Mail;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                      item.overdue
                        ? "border-danger/15 bg-danger-soft text-danger"
                        : item.interview
                          ? "border-warning/15 bg-warning-soft text-warning"
                          : item.followUp
                            ? "border-brand/15 bg-brand-soft text-brand"
                            : "border-border bg-surface-muted text-muted-strong",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium leading-tight text-foreground">{item.title}</p>
                    <p className="mt-0.5 truncate text-[10px] leading-tight text-muted">{item.meta}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[9.5px] tabular-nums",
                      item.overdue ? "font-medium text-danger" : "text-muted",
                    )}
                  >
                    {item.time}
                  </span>
                  <Circle className="h-3 w-3 shrink-0 text-border-strong transition-colors group-hover:text-brand" />
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            <CalendarDays className="h-3 w-3" />
            Open calendar
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-[10.5px] font-medium text-muted transition-colors hover:text-foreground"
          >
            All tasks
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
