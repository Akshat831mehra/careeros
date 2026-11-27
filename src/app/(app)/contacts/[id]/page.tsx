import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ListChecks,
  Mail,
  Phone,
  Send,
  StickyNote,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { ContactDetailActions } from "@/components/contacts/contact-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { LinkedinIcon } from "@/components/icons";
import {
  CONTACT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_VARIANTS,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_STATUS_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatShortDate, initials, relativeTime, titleCase } from "@/lib/utils";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Contact" };

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

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, userId: user.id },
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!contact) notFound();

  const [outreach, events, tasks, activities] = await Promise.all([
    prisma.outreach.findMany({
      where: { userId: user.id, contactId: contact.id },
      include: { company: { select: { name: true } } },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id, contactId: contact.id },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: { userId: user.id, contactId: contact.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 10,
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const openTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const upcomingEvents = events.filter((event) => !event.completed && event.startAt >= new Date());
  const replied = outreach.filter((record) => record.status === "REPLIED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        backHref="/contacts"
        backLabel="All contacts"
        eyebrow="Contact profile"
        title={contact.fullName}
        description={[contact.designation, contact.company?.name].filter(Boolean).join(" · ") || "Your relationship with this person."}
      >
        <ContactDetailActions contact={contact} companies={companies} />
      </PageHeader>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant={RELATIONSHIP_STATUS_VARIANTS[contact.relationship]}>
          {RELATIONSHIP_STATUS_LABELS[contact.relationship]}
        </Badge>
        <Badge variant="outline">{CONTACT_TYPE_LABELS[contact.type]}</Badge>
        {contact.company && (
          <Link
            href={`/companies/${contact.company.id}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand"
          >
            <Building2 className="h-3 w-3" />
            {contact.company.name}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Outreach" value={outreach.length} sub="Messages logged" icon={Send} tone="brand" />
        <StatCard label="Replies" value={replied} sub="Conversations started" icon={Mail} tone="green" />
        <StatCard label="Follow-ups" value={upcomingEvents.length} sub="Upcoming reminders" icon={CalendarClock} tone="amber" />
        <StatCard label="Open tasks" value={openTasks.length} sub="Still to do" icon={ListChecks} tone="blue" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <SectionTitle title="Contact details" />
            <CardContent className="pt-2">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
                  {initials(contact.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{contact.fullName}</p>
                  <p className="truncate text-[11px] text-muted">{contact.designation || CONTACT_TYPE_LABELS[contact.type]}</p>
                </div>
              </div>
              <DetailRow label="Department" value={contact.department || "—"} />
              <DetailRow label="Email" value={contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-brand">{contact.email}</a> : "—"} />
              <DetailRow label="Phone" value={contact.phone || "—"} />
              <DetailRow
                label="LinkedIn"
                value={
                  contact.linkedinUrl ? (
                    <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                      <LinkedinIcon className="h-3 w-3" /> View profile
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow label="Company" value={contact.company?.name ?? "—"} />
              <DetailRow label="Added" value={formatDate(contact.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Notes" count={contact.notes?.length ?? 0} />
            <CardContent className="pt-4">
              {contact.notes ? (
                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-strong">{contact.notes}</p>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <StickyNote className="h-4 w-4 text-muted" />
                  <p className="text-[11px] text-muted">No notes yet. Add context from the edit dialog.</p>
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
            <SectionTitle title="Outreach history" count={outreach.length} />
            <CardContent className="p-0">
              {outreach.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">No outreach recorded with this person.</p>
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
                      <p className="mt-1 text-[9.5px] text-muted/80">
                        {OUTREACH_CHANNEL_LABELS[record.channel]} · {record.company.name} ·{" "}
                        {record.sentAt ? formatShortDate(record.sentAt) : "Not sent"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Follow-ups" count={events.length} />
              <CardContent className="space-y-2 pt-4">
                {events.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted">No follow-ups scheduled.</p>
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
                  <p className="py-4 text-center text-[11px] text-muted">No tasks linked to this contact.</p>
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

          <Card>
            <SectionTitle title="Applications linked through outreach" />
            <CardContent className="p-0">
              {outreach.filter((record) => record.applicationId).length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">No applications linked to your conversations here yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {outreach
                    .filter((record) => record.applicationId)
                    .map((record) => (
                      <Link
                        key={record.id}
                        href={`/applications/${record.applicationId}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">
                          {record.subject || OUTREACH_CHANNEL_LABELS[record.channel]}
                        </span>
                        <span className="text-[10px] text-muted">{titleCase(OUTREACH_CHANNEL_LABELS[record.channel])}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
