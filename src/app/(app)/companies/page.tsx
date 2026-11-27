import type { Metadata } from "next";
import { Activity, Building2, Star, Users } from "lucide-react";
import { Prisma, CompanyStatus, Priority } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { CompaniesWorkspace, type CompanyRow } from "@/components/companies/companies-workspace";
import { StatCard } from "@/components/dashboard/stat-card";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Companies" };

type SearchParams = Promise<{ q?: string; status?: string; priority?: string }>;

function isCompanyStatus(value: string | undefined): value is CompanyStatus {
  return value === "TARGET" || value === "CONTACTED" || value === "APPLIED" || value === "NOT_INTERESTED";
}

function isPriority(value: string | undefined): value is Priority {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW";
}

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();

  const where: Prisma.CompanyWhereInput = {
    userId: user.id,
    ...(isCompanyStatus(params.status) ? { status: params.status } : {}),
    ...(isPriority(params.priority) ? { priority: params.priority } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
            { website: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [companies, allCompanies] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { _count: { select: { applications: true, contacts: true, outreach: true } } },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: {
        priority: true,
        status: true,
        _count: { select: { applications: true, contacts: true } },
      },
    }),
  ]);

  const highPriority = allCompanies.filter((company) => company.priority === "HIGH").length;
  const active = allCompanies.filter(
    (company) => company.status === "CONTACTED" || company.status === "APPLIED",
  ).length;
  const applicationCount = allCompanies.reduce((sum, company) => sum + company._count.applications, 0);
  const contactCount = allCompanies.reduce((sum, company) => sum + company._count.contacts, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Target list"
        title="Companies"
        description="Every company you are tracking, with its priority, status and the people you know there."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Companies" value={allCompanies.length} sub="On your target list" icon={Building2} tone="brand" />
        <StatCard label="High priority" value={highPriority} sub="Worth focused effort" icon={Star} tone="amber" />
        <StatCard label="Active" value={active} sub="Contacted or applied" icon={Activity} tone="blue" />
        <StatCard
          label="Connections"
          value={contactCount}
          sub={`${applicationCount} applications tracked`}
          icon={Users}
          tone="green"
        />
      </section>

      <CompaniesWorkspace companies={companies as CompanyRow[]} />
    </div>
  );
}
