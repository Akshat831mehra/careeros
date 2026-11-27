import {
  ArrowRight,
  ArrowRightLeft,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarPlus,
  CheckCheck,
  CheckCircle2,
  ListPlus,
  Mail,
  MessageSquare,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard";
import { cn, relativeTime } from "@/lib/utils";

const activityStyles: Record<string, { icon: LucideIcon; className: string }> = {
  APPLICATION_SUBMITTED: { icon: BriefcaseBusiness, className: "bg-info-soft text-info border-info/15" },
  HR_CONTACTED: { icon: Mail, className: "bg-brand-soft text-brand border-brand/15" },
  LINKEDIN_MESSAGE: { icon: MessageSquare, className: "bg-brand-soft text-brand border-brand/15" },
  FOLLOW_UP_COMPLETED: { icon: CheckCircle2, className: "bg-success-soft text-success border-success/15" },
  INTERVIEW_SCHEDULED: { icon: CalendarCheck2, className: "bg-warning-soft text-warning border-warning/15" },
  STATUS_UPDATED: { icon: ArrowRightLeft, className: "bg-brand-soft text-brand border-brand/15" },
  COMPANY_ADDED: { icon: Building2, className: "bg-surface-hover text-muted-strong border-border" },
  CONTACT_ADDED: { icon: UserPlus, className: "bg-surface-hover text-muted-strong border-border" },
  OUTREACH_SENT: { icon: Send, className: "bg-brand-soft text-brand border-brand/15" },
  EVENT_SCHEDULED: { icon: CalendarPlus, className: "bg-warning-soft text-warning border-warning/15" },
  TASK_ADDED: { icon: ListPlus, className: "bg-surface-hover text-muted-strong border-border" },
  TASK_COMPLETED: { icon: CheckCheck, className: "bg-success-soft text-success border-success/15" },
};

export function RecentActivity({ data }: { data: DashboardData }) {
  const activities = data.activities.slice(0, 6);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-0">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <p className="mt-1 text-[11px] text-muted">What&apos;s moved in your search</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[9.5px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
          Live
        </span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-4">
        {activities.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <BriefcaseBusiness className="h-5 w-5 text-muted" />
            <p className="text-[12px] font-medium text-foreground">No activity yet</p>
            <p className="text-[11px] text-muted">Your updates will appear here.</p>
          </div>
        ) : (
          <div>
            {activities.map((activity, index) => {
              const style = activityStyles[activity.type] ?? activityStyles.STATUS_UPDATED;
              const Icon = style.icon;
              return (
                <div key={activity.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {index < activities.length - 1 && (
                    <span className="absolute left-[12px] top-7 h-[calc(100%-16px)] w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      style.className,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11.5px] font-medium leading-tight text-foreground">{activity.title}</p>
                      <span className="shrink-0 text-[9px] text-muted">{relativeTime(activity.createdAt)}</span>
                    </div>
                    {activity.description && (
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-auto border-t border-border pt-3">
          <a
            href="/applications"
            className="flex items-center gap-1 text-[10.5px] font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            View application activity
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
