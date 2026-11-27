import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/page-header";
import { ProfileEditButton } from "@/components/profile/profile-edit-button";
import { ResumeManager } from "@/components/profile/resume-manager";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { WORK_MODE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "My Profile" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-strong">{label}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}

function Chips({ values }: { values: string[] }) {
  if (!values.length) return <span className="text-[12px] text-muted">Not added</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span key={value} className="rounded-md border border-border bg-surface-muted/50 px-2 py-1 text-[11px] text-foreground-soft">
          {value}
        </span>
      ))}
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, resumes] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { userId: user.id } }),
    prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        eyebrow="Private workspace"
        title="My Profile"
        description="Your private source of truth for career details and job-search preferences."
      >
        <ProfileEditButton
          name={user.name}
          profile={
            profile
              ? {
                  headline: profile.headline,
                  location: profile.location,
                  openToWork: profile.openToWork,
                  currentDesignation: profile.currentDesignation,
                  totalExperience: profile.totalExperience,
                  currentCompany: profile.currentCompany,
                  linkedinUrl: profile.linkedinUrl,
                  githubUrl: profile.githubUrl,
                  preferredRoles: profile.preferredRoles,
                  preferredLocations: profile.preferredLocations,
                  workMode: profile.workMode,
                  expectedSalary: profile.expectedSalary,
                  noticePeriod: profile.noticePeriod,
                  skills: profile.skills,
                  bio: profile.bio,
                  projectsAchievements: profile.projectsAchievements,
                  updatedAt: profile.updatedAt,
                }
              : null
          }
        />
      </PageHeader>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-foreground text-[18px] font-semibold text-background">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-semibold tracking-[-0.03em] text-foreground">{user.name}</h2>
                {profile?.openToWork && <Badge variant="success">Open to work</Badge>}
              </div>
              <p className="mt-1 text-[13px] text-foreground-soft">
                {profile?.headline || "Add your professional headline"}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {profile?.location || "Add your location"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {profile?.linkedinUrl && (
              <Button variant="secondary" size="sm" asChild>
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                  <LinkedinIcon className="h-3.5 w-3.5" />
                  LinkedIn
                </a>
              </Button>
            )}
            {profile?.githubUrl && (
              <Button variant="secondary" size="sm" asChild>
                <a href={profile.githubUrl} target="_blank" rel="noreferrer">
                  <GithubIcon className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </Button>
            )}
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-strong">
              Professional summary
            </h3>
            <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-foreground-soft">{profile.bio}</p>
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Professional information" description="Your experience, skills and saved professional links.">
          <dl>
            <Detail label="Current role">{profile?.currentDesignation || "Not added"}</Detail>
            <Detail label="Total experience">{profile?.totalExperience || "Not added"}</Detail>
            <Detail label="Technical skills">
              <Chips values={profile?.skills ?? []} />
            </Detail>
            <Detail label="Projects and achievements">
              {profile?.projectsAchievements ? (
                <span className="whitespace-pre-line">{profile.projectsAchievements}</span>
              ) : (
                <span className="text-muted">Not added</span>
              )}
            </Detail>
            <Detail label="LinkedIn">
              {profile?.linkedinUrl ? (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-brand transition-colors hover:text-brand-hover"
                >
                  {profile.linkedinUrl}
                </a>
              ) : (
                <span className="text-muted">Not added</span>
              )}
            </Detail>
            <Detail label="GitHub">
              {profile?.githubUrl ? (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-brand transition-colors hover:text-brand-hover"
                >
                  {profile.githubUrl}
                </a>
              ) : (
                <span className="text-muted">Not added</span>
              )}
            </Detail>
          </dl>
        </Section>

        <Section title="Job preferences" description="Used to keep your search focused. Nothing here is public.">
          <dl>
            <Detail label="Preferred job roles">
              <Chips values={profile?.preferredRoles ?? []} />
            </Detail>
            <Detail label="Preferred locations">
              <Chips values={profile?.preferredLocations ?? []} />
            </Detail>
            <Detail label="Work mode">
              {profile?.workMode ? WORK_MODE_LABELS[profile.workMode] : "Not set"}
            </Detail>
            <Detail label="Expected salary">{profile?.expectedSalary || "Not added"}</Detail>
            <Detail label="Notice period">{profile?.noticePeriod || "Not added"}</Detail>
          </dl>
        </Section>
      </div>

      <ResumeManager
        key={user.id}
        resumes={resumes.map((resume) => ({
          id: resume.id,
          name: resume.name,
          fileName: resume.fileName,
          fileUrl: resume.fileUrl,
          fileSize: resume.fileSize,
          mimeType: resume.mimeType,
          isDefault: resume.isDefault,
          createdAt: resume.createdAt.toISOString(),
          updatedAt: resume.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
