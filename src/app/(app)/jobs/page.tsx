import type { Metadata } from "next";
import { headers } from "next/headers";
import type { JobCaptureKind, JobCaptureStatus, JobSource } from "@prisma/client";
import { CheckCircle2, Crosshair, Radar, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureIntegrationToken } from "@/lib/job-radar";
import { PageHeader } from "@/components/modules/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { JobsWorkspace, type CaptureRow, type SavedSearchRow } from "@/components/jobs/jobs-workspace";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Job Radar" };

export default async function JobsPage() {
  const user = await requireUser();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3100";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  const [token, savedSearches, captures] = await Promise.all([
    ensureIntegrationToken(user.id),
    prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobCapture.findMany({
      where: { userId: user.id },
      include: { application: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const searchRows: SavedSearchRow[] = savedSearches.map((search) => ({
    id: search.id,
    name: search.name,
    query: search.query,
    location: search.location,
    locations: search.locations,
    experienceMin: search.experienceMin,
    experienceMax: search.experienceMax,
    postedWithinHours: search.postedWithinHours,
    sources: search.sources as JobSource[],
    createdAt: search.createdAt.toISOString(),
  }));

  const captureRows: CaptureRow[] = captures.map((capture) => ({
    id: capture.id,
    source: capture.source as JobSource,
    kind: capture.kind as JobCaptureKind,
    status: capture.status as JobCaptureStatus,
    url: capture.url,
    title: capture.title,
    companyName: capture.companyName,
    location: capture.location,
    postedAt: capture.postedAt?.toISOString() ?? null,
    searchQuery: capture.searchQuery,
    createdAt: capture.createdAt.toISOString(),
    applicationId: capture.applicationId,
  }));

  const appliedCount = captureRows.filter((capture) => capture.kind === "APPLIED").length;
  const recentCount = captureRows.filter(
    (capture) => capture.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  ).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Discovery"
        title="Job Radar"
        description="Set your filters once, open the portals, and let one bookmarklet bring every matching or applied job straight into your pipeline."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saved searches" value={searchRows.length} sub="Ready to run" icon={Radar} tone="brand" />
        <StatCard label="Captured jobs" value={captureRows.length} sub="From all portals" icon={Crosshair} tone="blue" />
        <StatCard label="Applied captured" value={appliedCount} sub="Auto-tracked" icon={CheckCircle2} tone="green" />
        <StatCard label="This week" value={recentCount} sub="New captures" icon={Sparkles} tone="amber" />
      </section>

      <JobsWorkspace
        token={token}
        baseUrl={baseUrl}
        savedSearches={searchRows}
        captures={captureRows}
      />
    </div>
  );
}
