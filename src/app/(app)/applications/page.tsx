import type { Metadata } from "next";
import { ApplicationStatus, Prisma, WorkMode } from "@prisma/client";
import { BriefcaseBusiness, CalendarClock, CheckCircle2, Trophy } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ApplicationsWorkspace,
  type ApplicationRow,
} from "@/components/applications/applications-workspace";
import { ACTIVE_STATUSES } from "@/lib/dashboard";
import { APPLICATION_STATUSES, WORK_MODES } from "@/lib/constants";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Applications" };

type SearchParams = Promise<{ q?: string; company?: string; status?: string; workMode?: string }>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();

  const where: Prisma.ApplicationWhereInput = {
    userId: user.id,
    ...(params.company ? { companyId: params.company } : {}),
    ...(APPLICATION_STATUSES.includes(params.status as ApplicationStatus)
      ? { status: params.status as ApplicationStatus }
      : {}),
    ...(WORK_MODES.includes(params.workMode as WorkMode) ? { workMode: params.workMode as WorkMode } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
            { salaryRange: { contains: query, mode: "insensitive" } },
            { referralSource: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { company: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [applications, allApplications, companies, resumes] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, priority: true } },
        _count: { select: { outreach: true, events: true, tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.application.findMany({ where: { userId: user.id }, select: { status: true } }),
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

  const interviews = allApplications.filter((application) =>
    ["TECHNICAL_INTERVIEW", "MANAGERIAL_INTERVIEW", "FINAL_INTERVIEW"].includes(application.status),
  ).length;
  const offers = allApplications.filter((application) => application.status === "OFFER_RECEIVED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Pipeline"
        title="Applications"
        description="Every opportunity and every stage — from first interest to offer. Switch between a sortable table and a drag-and-drop board."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Applications" value={allApplications.length} sub="Tracked opportunities" icon={BriefcaseBusiness} tone="brand" />
        <StatCard label="Active" value={allApplications.filter((app) => ACTIVE_STATUSES.includes(app.status)).length} sub="In progress" icon={CalendarClock} tone="blue" />
        <StatCard label="Interviewing" value={interviews} sub="Across interview stages" icon={CheckCircle2} tone="amber" />
        <StatCard label="Offers" value={offers} sub="Received so far" icon={Trophy} tone="green" />
      </section>

      <ApplicationsWorkspace
        applications={applications as ApplicationRow[]}
        companies={companies}
        resumes={resumes}
      />
    </div>
  );
}
