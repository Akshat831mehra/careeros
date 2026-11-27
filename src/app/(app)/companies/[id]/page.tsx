import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  Globe,
  Mail,
  Send,
  StickyNote,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { CompanyDetailActions } from "@/components/companies/company-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { LinkedinIcon } from "@/components/icons";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VARIANTS,
  COMPANY_STATUS_LABELS,
  COMPANY_STATUS_VARIANTS,
  CONTACT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_VARIANTS,
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
} from "@/lib/constants";
import { formatDate, formatDateTime, initials, relativeTime, titleCase } from "@/lib/utils";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Company" };

function OverviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border py-2.5 last:border-0">
      <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-0.5 truncate text-[11.5px] text-foreground-soft">{value}</div>
    </div>
  );
}

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

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const company = await prisma.company.findFirst({ where: { id, userId: user.id } });
  if (!company) notFound();

  const [applications, contacts, outreach, events, activities] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id, companyId: company.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { userId: user.id, companyId: company.id },
      orderBy: [{ type: "asc" }, { fullName: "asc" }],
    }),
    prisma.outreach.findMany({
      where: { userId: user.id, companyId: company.id },
      include: { contact: { select: { fullName: true } } },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id, companyId: company.id, completed: false },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id, companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const hrContacts = contacts.filter((contact) =>
    ["HR", "RECRUITER", "TALENT_ACQUISITION"].includes(contact.type),
  );
  const seniorContacts = contacts.filter((contact) => !hrContacts.includes(contact));
  const upcomingEvents = events.filter((event) => event.startAt >= new Date());

  return (
    <div className="animate-fade-in">
      <PageHeader
        backHref="/companies"
        backLabel="All companies"
        eyebrow="Company profile"
        title={company.name}
        description={[company.industry, company.location].filter(Boolean).join(" · ") || "Track everything about this company in one place."}
      >
        <CompanyDetailActions company={company} />
      </PageHeader>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant={COMPANY_STATUS_VARIANTS[company.status]}>{COMPANY_STATUS_LABELS[company.status]}</Badge>
        <Badge variant={PRIORITY_VARIANTS[company.priority]}>{PRIORITY_LABELS[company.priority]} priority</Badge>
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand"
          >
            Website
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {company.careersUrl && (
          <a
            href={company.careersUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand"
          >
            Careers
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {company.linkedinUrl && (
          <a
            href={company.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-brand"
          >
            LinkedIn
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Applications" value={applications.length} sub="Opportunities tracked" icon={BriefcaseBusiness} tone="blue" />
        <StatCard label="Contacts" value={contacts.length} sub="People at this company" icon={Users} tone="brand" />
        <StatCard label="Outreach" value={outreach.length} sub="Messages recorded" icon={Send} tone="amber" />
        <StatCard label="Follow-ups" value={upcomingEvents.length} sub="Upcoming reminders" icon={CalendarClock} tone="green" />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <SectionTitle title="Company overview" />
            <CardContent className="pt-2">
              <OverviewRow label="Industry" value={company.industry || "—"} />
              <OverviewRow label="Location" value={company.location || "—"} />
              <OverviewRow label="Company size" value={company.size || "—"} />
              <OverviewRow label="Priority" value={PRIORITY_LABELS[company.priority]} />
              <OverviewRow label="Status" value={COMPANY_STATUS_LABELS[company.status]} />
              <OverviewRow label="Date added" value={formatDate(company.createdAt)} />
              <OverviewRow
                label="Links"
                value={
                  <div className="flex flex-wrap items-center gap-3">
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                    {company.linkedinUrl && (
                      <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                        <LinkedinIcon className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {!company.website && !company.linkedinUrl && "—"}
                  </div>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Notes" count={company.notes?.length ?? 0} />
            <CardContent className="pt-4">
              {company.notes ? (
                <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-strong">{company.notes}</p>
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
            <SectionTitle title="Applications" count={applications.length} />
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">No applications at this company yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {applications.map((application) => (
                    <div key={application.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground">{application.title}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted">
                          {[application.location, application.workMode && titleCase(application.workMode)]
                            .filter(Boolean)
                            .join(" · ") || "Location not set"}
                        </p>
                      </div>
                      <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Badge>
                      {application.postingUrl && (
                        <a
                          href={application.postingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted transition-colors hover:text-brand"
                          aria-label="Open job posting"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title="HR & recruiters" count={hrContacts.length} />
              <CardContent className="space-y-2 pt-4">
                {hrContacts.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted">No recruiter contacts yet.</p>
                ) : (
                  hrContacts.map((contact) => (
                    <ContactRow key={contact.id} contact={contact} />
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <SectionTitle title="Senior employees & managers" count={seniorContacts.length} />
              <CardContent className="space-y-2 pt-4">
                {seniorContacts.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted">No senior contacts yet.</p>
                ) : (
                  seniorContacts.map((contact) => (
                    <ContactRow key={contact.id} contact={contact} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <SectionTitle title="Outreach history" count={outreach.length} />
            <CardContent className="p-0">
              {outreach.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">No outreach recorded yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {outreach.slice(0, 6).map((record) => (
                    <div key={record.id} className="px-5 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Send className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[11.5px] font-medium text-foreground">
                              {record.subject || OUTREACH_CHANNEL_LABELS[record.channel]}
                            </p>
                            <Badge variant={OUTREACH_STATUS_VARIANTS[record.status]}>
                              {OUTREACH_STATUS_LABELS[record.status]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-muted">
                            {OUTREACH_CHANNEL_LABELS[record.channel]} · {record.contact.fullName}
                            {record.sentAt ? ` · ${formatDate(record.sentAt)}` : " · Not sent"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionTitle title="Upcoming follow-ups" count={upcomingEvents.length} />
            <CardContent className="p-0">
              {upcomingEvents.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-muted">Nothing scheduled for this company.</p>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-foreground">{event.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {EVENT_TYPE_LABELS[event.type]} · {formatDateTime(event.startAt)}
                        </p>
                      </div>
                    </div>
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

function ContactRow({
  contact,
}: {
  contact: {
    id: string;
    fullName: string;
    designation: string | null;
    email: string | null;
    linkedinUrl: string | null;
    type: keyof typeof CONTACT_TYPE_LABELS;
    relationship: string;
  };
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
        {initials(contact.fullName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium text-foreground">{contact.fullName}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted">{contact.designation || CONTACT_TYPE_LABELS[contact.type]}</p>
      </div>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="text-muted transition-colors hover:text-brand" aria-label="Email contact">
          <Mail className="h-3.5 w-3.5" />
        </a>
      )}
      {contact.linkedinUrl && (
        <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-brand" aria-label="LinkedIn profile">
          <LinkedinIcon className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
