import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ExternalLink,
  FileText,
  ListChecks,
  Send,
  StickyNote,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { ApplicationDetailActions } from "@/components/applications/application-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VARIANTS,
  CONTACT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  WORK_MODE_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatShortDate, relativeTime, titleCase } from "@/lib/utils";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Application" };

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <CardHeader className="border-b border-border pb-3.5">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {typeof count === "number" && <span className="text-[10px] tabular-nums text-muted">{count}</span>}
      </div>
    </CardHeader>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-2.5 last:border-0">
      <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-0.5 min-w-0 text-[11.5px] text-foreground-soft">{value}</div>
    </div>
  );
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [application, companies, resumes] = await Promise.all([
    prisma.application.findFirst({
      where: { id, userId: user.id },
      include: {
        company: { select: { id: true, name: true } },
        resume: { select: { id: true, name: true } },
      },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.resume.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);
  if (!application) notFound();

  const [outreach, events, tasks, activities] = await Promise.all([
    prisma.outreach.findMany({
      where: { userId: user.id, applicationId: application.id },
      include: { contact: { select: { id: true, fullName: true, type: true } } },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id, applicationId: application.id },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: { userId: user.id, applicationId: application.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 10,
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, applicationId: application.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const interviews = events.filter((event) =>
    ["INTERVIEW", "TECHNICAL_ASSESSMENT"].includes(event.type),
  ).length;
  const openTasks = tasks.filter((task) => task.status !== "COMPLETED").length;
  const upcomingEvents = events.filter((event) => !event.completed && event.startAt >= new Date());

  return (
    <div className="animate-fade-in">
      <PageHeader
        backHref="/applications"
        backLabel="All applications"
        eyebrow="Application"
        title={application.title}
        description={[application.company.name, application.location].filter(Boolean).join(" · ")}
      >
        <ApplicationDetailActions application={application} companies={companies} resumes={resumes} />
      </PageHeader>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]}>
          {APPLICATION_STATUS_LABELS[application.status]}
        </Badge>
        <Badge variant="outline">{WORK_MODE_LABELS[application.workMode]}</Badge>
        <Badge variant="default">{titleCase(application.employmentType)}</Badge>
        {application.salaryRange && <Badge variant="default">{application.salaryRange}</Badge>}
        <Link
          href={`/companies/${application.company.id}`}
          className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand"
        >
          <Building2 className="h-3 w-3" />
          {application.company.name}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Outreach" value={outreach.length} sub="Conversations logged" icon={Send} tone="brand" />
        <StatCard label="Interviews" value={interviews} sub="Scheduled sessions" icon={Users} tone="amber" />
        <StatCard label="Open tasks" value={openTasks} sub="Still to do" icon={ListChecks} tone="blue" />
        <StatCard label="Next follow-up" value={formatShortDate(application.nextFollowUp)} sub="From application record" icon={CalendarClock} tone="green" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <SectionTitle title="Role details" />
            <CardContent className="pt-2">
              <DetailRow label="Company" value={application.company.name} />
              <DetailRow label="Status" value={APPLICATION_STATUS_LABELS[application.status]} />
              <DetailRow label="Location" value={application.location || "—"} />
              <DetailRow label="Work mode" value={WORK_MODE_LABELS[application.workMode]} />
              <DetailRow label="Employment type" value={application.employmentType} />
              <DetailRow label="Salary range" value={application.salaryRange || "—"} />
              <DetailRow label="Date applied" value={formatDate(application.dateApplied)} />
              <DetailRow label="Referral source" value={application.referralSource || "—"} />
              <DetailRow label="Resume" value={application.resume?.name ?? "No resume selected"} />
              <DetailRow
                label="Links"
                value={
                  <div className="flex flex-wrap items-center gap-3">
                    {application.postingUrl && (
                      <a href={application.postingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                        <ExternalLink className="h-3 w-3" /> Posting
                      </a>
                    )}
                    {application.careersUrl && (
                      <a href={application.careersUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                        <FileText className="h-3 w-3" /> Careers
                      </a>
                    )}
                    {!application.postingUrl && !application.careersUrl && "—"}
                  </div>
                }
              />
              <DetailRow label="Added" value={formatDate(application.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Description" count={application.description?.length ?? 0} />
            <CardContent className="pt-4">
              {application.description ? (
                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-strong">{application.description}</p>
              ) : (
                <p className="py-4 text-center text-[11px] text-muted">No description saved for this role.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Notes" count={application.notes?.length ?? 0} />
            <CardContent className="pt-4">
              {application.notes ? (
                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-strong">{application.notes}</p>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <StickyNote className="h-4 w-4 text-muted" />
                  <p className="text-[11px] text-muted">No notes yet. Add them from the edit dialog.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Activity timeline" count={activities.length} />
            <CardContent className="pt-3">
              {activities.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted">No activity recorded yet.</p>
              ) : (
                <div className="relative space-y-4 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-border">
                  {activities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-3">
                      <span className="z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted">
                        <ActivityIcon className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[11.5px] font-medium text-foreground">{activity.title}</p>
                        {activity.description && (
                          <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{activity.description}</p>
                        )}
                        <p className="mt-1 text-[9.5px] text-muted/80">{relativeTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-7">
          <Card>
            <SectionTitle title="Outreach" count={outreach.length} />
            <CardContent className="p-0">
              {outreach.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">No outreach linked to this application.</p>
              ) : (
                <div className="divide-y divide-border">
                  {outreach.slice(0, 8).map((record) => (
                    <div key={record.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">
                          {record.subject || OUTREACH_CHANNEL_LABELS[record.channel]}
                        </p>
                        <Badge variant={OUTREACH_STATUS_VARIANTS[record.status]}>
                          {OUTREACH_STATUS_LABELS[record.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">{record.message}</p>
                      <Link
                        href={`/contacts/${record.contact.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-muted transition-colors hover:text-brand"
                      >
                        {record.contact.fullName} · {CONTACT_TYPE_LABELS[record.contact.type]}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Interviews & follow-ups" count={events.length} />
              <CardContent className="space-y-2 pt-4">
                {events.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted">Nothing scheduled.</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <CalendarClock className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <p className={`truncate text-[11.5px] font-medium ${event.completed ? "text-muted line-through" : "text-foreground"}`}>
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">{formatDateTime(event.startAt)}</p>
                        <p className="mt-0.5 text-[9.5px] text-muted/80">{EVENT_TYPE_LABELS[event.type]}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <SectionTitle title="Tasks" count={tasks.length} />
              <CardContent className="space-y-2 pt-4">
                {tasks.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted">No tasks linked to this application.</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                        <ListChecks className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[11.5px] font-medium ${task.status === "COMPLETED" ? "text-muted line-through" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : "No due date"}
                        </p>
                      </div>
                      <Badge variant={TASK_STATUS_VARIANTS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {upcomingEvents.length > 0 && (
            <Card>
              <SectionTitle title="Coming up next" count={upcomingEvents.length} />
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 rounded-lg border border-brand/15 bg-brand-soft/60 p-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 text-brand" />
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{upcomingEvents[0].title}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">{formatDateTime(upcomingEvents[0].startAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
