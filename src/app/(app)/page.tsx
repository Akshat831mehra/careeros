import type { Metadata } from "next";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { UpcomingSchedule } from "@/components/dashboard/upcoming-schedule";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { firstName, friendlyDate, getGreeting, formatTime } from "@/lib/utils";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const highPriority = data.companies.filter((company) => company.priority === "HIGH").length;
  const nextInterview = data.upcomingEvents.find((event) => event.type === "INTERVIEW");
  const offerApplication = data.applications.find((application) => application.status === "OFFER_RECEIVED");
  const pendingFocus =
    data.today.events.length + data.today.tasks.length + data.today.overdue.length + data.overdueTasks.length;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {format(data.now, "EEEE, MMMM d")}
          </div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-foreground sm:text-[28px]">
            {getGreeting()}, {firstName(user.name)}.
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {pendingFocus > 0
              ? `${pendingFocus} ${pendingFocus === 1 ? "item needs" : "items need"} your attention today. Here's the full picture.`
              : "Your search is in good shape today. Here's the full picture."}
          </p>
        </div>
        <DashboardActions />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Companies"
          value={data.stats.companies}
          sub={`${highPriority} high priority`}
          icon={Building2}
          tone="brand"
        />
        <StatCard
          label="Applications"
          value={data.stats.applications}
          sub={`${data.stats.submitted} submitted`}
          icon={BriefcaseBusiness}
          tone="blue"
        />
        <StatCard
          label="Submitted"
          value={data.stats.submitted}
          sub={`${data.stats.responseRate}% response rate`}
          icon={Send}
          tone="neutral"
        />
        <StatCard
          label="In progress"
          value={data.stats.active}
          sub="Active opportunities"
          icon={Activity}
          tone="amber"
        />
        <StatCard
          label="Interviews"
          value={data.stats.interviews}
          sub={
            nextInterview
              ? `Next ${friendlyDate(nextInterview.startAt).toLowerCase()} · ${formatTime(nextInterview.startAt)}`
              : "None scheduled"
          }
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard
          label="Offers"
          value={data.stats.offers}
          sub={offerApplication ? `${offerApplication.company.name} · received` : "Keep going"}
          icon={Trophy}
          tone="green"
        />
        <StatCard
          label="Rejections"
          value={data.stats.rejections}
          sub="Archived applications"
          icon={XCircle}
          tone="red"
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <PipelineCard data={data} />
        </div>
        <div className="xl:col-span-4">
          <TodayFocus data={data} />
        </div>
        <div className="xl:col-span-7">
          <UpcomingSchedule data={data} />
        </div>
        <div className="xl:col-span-5">
          <RecentActivity data={data} />
        </div>
      </section>

      <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-5 text-[10px] text-muted sm:flex-row">
        <p>
          CareerOS · Your personal command center for getting hired.
        </p>
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          All data saved to your private workspace
        </p>
      </footer>
    </div>
  );
}
