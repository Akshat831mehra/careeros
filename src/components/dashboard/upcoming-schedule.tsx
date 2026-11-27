import Link from "next/link";
import { ArrowUpRight, CalendarDays, Video } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard";
import { formatTime } from "@/lib/utils";

const eventLabels: Record<string, string> = {
  HR_FOLLOW_UP: "HR follow-up",
  RECRUITER_FOLLOW_UP: "Recruiter follow-up",
  INTERVIEW: "Interview",
  TECHNICAL_ASSESSMENT: "Assessment",
  APPLICATION_DEADLINE: "Deadline",
  NETWORKING: "Networking",
  CUSTOM: "Reminder",
};

export function UpcomingSchedule({ data }: { data: DashboardData }) {
  const events = data.upcomingEvents.slice(0, 5);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-0">
        <div>
          <CardTitle>Upcoming</CardTitle>
          <p className="mt-1 text-[11px] text-muted">The next things on your calendar</p>
        </div>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-[10.5px] font-medium text-muted transition-colors hover:text-foreground"
        >
          Calendar
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-4">
        {events.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarDays className="h-5 w-5 text-muted" />
            <p className="text-[12px] font-medium text-foreground">Your calendar is clear</p>
            <p className="text-[11px] text-muted">Schedule a follow-up to stay on track.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => {
              const today = isToday(event.startAt);
              return (
                <Link
                  key={event.id}
                  href="/calendar"
                  className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border ${
                      today
                        ? "border-brand/20 bg-brand-soft text-brand"
                        : "border-border bg-surface-muted text-muted-strong"
                    }`}
                  >
                    <span className="text-[7.5px] font-semibold uppercase tracking-[0.08em]">
                      {format(event.startAt, "MMM")}
                    </span>
                    <span className="text-[14px] font-semibold leading-none tabular-nums">
                      {format(event.startAt, "d")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-foreground">{event.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                      {event.company && <span className="truncate">{event.company.name}</span>}
                      {event.company && <span className="text-border-strong">·</span>}
                      <span>{today ? "Today" : isTomorrow(event.startAt) ? "Tomorrow" : format(event.startAt, "EEE")}</span>
                      <span className="text-border-strong">·</span>
                      <span className="tabular-nums">{formatTime(event.startAt)}</span>
                    </div>
                  </div>

                  <span className="hidden items-center gap-1 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] text-muted sm:flex">
                    {event.type === "INTERVIEW" && <Video className="h-2.5 w-2.5" />}
                    {eventLabels[event.type] ?? "Event"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
