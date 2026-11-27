import { randomBytes } from "node:crypto";
import {
  ActivityType,
  ApplicationStatus,
  CompanyStatus,
  JobCaptureKind,
  JobCaptureStatus,
  JobSource,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { JOB_SOURCE_LABELS } from "@/lib/constants";
import type { JobIngestInput } from "@/lib/validations";

function newToken() {
  return randomBytes(32).toString("hex");
}

export async function ensureIntegrationToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiToken: true },
  });
  if (user?.apiToken) return user.apiToken;

  const token = newToken();
  await prisma.user.update({ where: { id: userId }, data: { apiToken: token } });
  return token;
}

export async function regenerateIntegrationToken(userId: string) {
  const token = newToken();
  await prisma.user.update({ where: { id: userId }, data: { apiToken: token } });
  return token;
}

const PORTAL_HOSTS = [
  "linkedin.com",
  "www.linkedin.com",
  "naukri.com",
  "www.naukri.com",
  "indeed.com",
  "www.indeed.com",
  "in.indeed.com",
  "indeed.co.in",
  "www.indeed.co.in",
  "instahyre.com",
  "www.instahyre.com",
  "cutshort.io",
  "www.cutshort.io",
  "hirist.com",
  "www.hirist.com",
  "hirist.tech",
  "www.hirist.tech",
  "wellfound.com",
  "www.wellfound.com",
  "angellist.com",
  "www.angellist.com",
];

export function portalCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  if (!origin) return {};

  let allowed = PORTAL_HOSTS.includes(origin);
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    allowed =
      PORTAL_HOSTS.includes(hostname) ||
      hostname.endsWith(".linkedin.com") ||
      hostname.endsWith(".naukri.com") ||
      hostname.endsWith(".indeed.com") ||
      hostname.endsWith(".indeed.co.in") ||
      hostname.endsWith(".instahyre.com") ||
      hostname.endsWith(".cutshort.io") ||
      hostname.endsWith(".hirist.com") ||
      hostname.endsWith(".hirist.tech") ||
      hostname.endsWith(".wellfound.com") ||
      hostname.endsWith(".angellist.com");
  } catch {
    allowed = false;
  }

  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export async function resolveApiUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (!token) return null;
    const user = await prisma.user.findUnique({
      where: { apiToken: token },
      select: { id: true },
    });
    return user?.id ?? null;
  }
  return getSessionUserId();
}

async function findOrCreateCompany(
  userId: string,
  name: string,
  website: string | null,
  sourceLabel: string,
  status: CompanyStatus,
) {
  const existing = await prisma.company.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    if (website) {
      await prisma.company.updateMany({
        where: { id: existing.id, website: null },
        data: { website },
      });
    }
    return { id: existing.id, created: false };
  }

  const company = await prisma.company.create({
    data: { userId, name, website: website || null, status },
  });
  await prisma.activityLog.create({
    data: {
      userId,
      type: ActivityType.COMPANY_ADDED,
      title: `Company added: ${name}`,
      description: `Auto-captured from ${sourceLabel}`,
      companyId: company.id,
      metadata: { source: sourceLabel, automated: true },
    },
  });
  return { id: company.id, created: true };
}

export async function ingestCapturedJobs(userId: string, input: JobIngestInput) {
  const sourceLabel = JOB_SOURCE_LABELS[input.source];
  const isApplied = input.kind === JobCaptureKind.APPLIED;

  let savedSearchId: string | null = null;
  if (input.savedSearchId) {
    const savedSearch = await prisma.savedSearch.findFirst({
      where: { id: input.savedSearchId, userId },
      select: { id: true },
    });
    savedSearchId = savedSearch?.id ?? null;
  }

  const result = {
    created: 0,
    updated: 0,
    companiesCreated: 0,
    applicationsCreated: 0,
    applicationsUpdated: 0,
  };

  for (const job of input.jobs) {
    const appliedAt = isApplied
      ? job.appliedAt
        ? new Date(job.appliedAt)
        : new Date()
      : null;

    const companyResult = await findOrCreateCompany(
      userId,
      job.company.trim(),
      job.companyUrl ?? null,
      sourceLabel,
      isApplied ? CompanyStatus.APPLIED : CompanyStatus.TARGET,
    );
    if (companyResult.created) result.companiesCreated += 1;

    const existingApplication = await prisma.application.findFirst({
      where: { userId, postingUrl: job.url },
      select: { id: true, status: true, referralSource: true },
    });

    let applicationId: string;
    if (existingApplication) {
      applicationId = existingApplication.id;
      const shouldUpdate = isApplied && existingApplication.status !== ApplicationStatus.APPLIED;

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          companyId: companyResult.id,
          title: job.title,
          ...(job.location ? { location: job.location } : {}),
          ...(job.description ? { description: job.description } : {}),
          ...(job.employmentType ? { employmentType: job.employmentType } : {}),
          ...(job.salaryText ? { salaryRange: job.salaryText } : {}),
          ...(isApplied
            ? {
                status: ApplicationStatus.APPLIED,
                dateApplied: appliedAt,
                referralSource: existingApplication.referralSource ?? `Auto-captured from ${sourceLabel}`,
              }
            : {}),
        },
      });

      if (shouldUpdate) {
        await prisma.activityLog.create({
          data: {
            userId,
            type: ActivityType.APPLICATION_SUBMITTED,
            title: `Application submitted: ${job.title}`,
            description: `Auto-captured from ${sourceLabel}`,
            companyId: companyResult.id,
            applicationId,
            metadata: { source: sourceLabel, automated: true },
          },
        });
        result.applicationsUpdated += 1;
      }
    } else {
      const application = await prisma.application.create({
        data: {
          userId,
          companyId: companyResult.id,
          title: job.title,
          description: job.description ?? null,
          postingUrl: job.url,
          location: job.location ?? null,
          employmentType: job.employmentType ?? "Full-time",
          salaryRange: job.salaryText ?? null,
          dateApplied: appliedAt,
          status: isApplied ? ApplicationStatus.APPLIED : ApplicationStatus.INTERESTED,
          referralSource: `Auto-captured from ${sourceLabel}`,
        },
      });
      applicationId = application.id;
      result.applicationsCreated += 1;

      if (isApplied) {
        await prisma.activityLog.create({
          data: {
            userId,
            type: ActivityType.APPLICATION_SUBMITTED,
            title: `Application submitted: ${job.title}`,
            description: `Auto-captured from ${sourceLabel}`,
            companyId: companyResult.id,
            applicationId,
            metadata: { source: sourceLabel, automated: true },
          },
        });
      }
    }

    const captureData = {
      userId,
      source: input.source,
      kind: input.kind,
      status: JobCaptureStatus.TRACKED,
      externalId: job.externalId ?? null,
      url: job.url,
      title: job.title,
      companyName: job.company.trim(),
      companyUrl: job.companyUrl ?? null,
      location: job.location ?? null,
      employmentType: job.employmentType ?? null,
      experienceMin: job.experienceMin ?? null,
      experienceMax: job.experienceMax ?? null,
      postedAt: job.postedAt ? new Date(job.postedAt) : null,
      description: job.description ?? null,
      salaryText: job.salaryText ?? null,
      searchQuery: input.searchQuery ?? null,
      searchLocation: input.searchLocation ?? null,
      savedSearchId,
      companyId: companyResult.id,
      applicationId,
      raw: job as Prisma.InputJsonValue,
    };

    const existingCapture = await prisma.jobCapture.findUnique({
      where: { userId_source_url: { userId, source: input.source, url: job.url } },
      select: { id: true },
    });

    if (existingCapture) {
      await prisma.jobCapture.update({ where: { id: existingCapture.id }, data: captureData });
      result.updated += 1;
    } else {
      await prisma.jobCapture.create({ data: captureData });
      result.created += 1;
    }
  }

  return result;
}
