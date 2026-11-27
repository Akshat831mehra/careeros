import type { Metadata } from "next";
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/modules/page-header";
import { ProfileEditButton } from "@/components/profile/profile-edit-button";
import { ResumeManager } from "@/components/profile/resume-manager";
import { formatDate, initials } from "@/lib/utils";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, resumes, applicationCount] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { userId: user.id } }),
    prisma.resume.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    prisma.application.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Candidate profile"
        title="My Profile"
        description="The source of truth for your search — experience, preferences and resume versions."
      >
        <ProfileEditButton profile={profile ?? null} />
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="dotted-grid h-20 border-b border-border bg-surface-muted/60" />
        <CardContent className="relative -mt-9 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-surface bg-foreground text-[22px] font-semibold text-background shadow-sm">
                {initials(user.name)}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-foreground">{user.name}</h2>
                  <Badge variant="success">Open to work</Badge>
                </div>
                <p className="mt-1 text-[12px] text-muted">{profile?.headline ?? "Add your headline"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile?.preferredLocations.join(", ") || "Add locations"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
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
              {profile?.portfolioUrl && (
                <Button variant="secondary" size="sm" asChild>
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                    <Globe className="h-3.5 w-3.5" />
                    Portfolio
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
            {[
              { label: "Experience", value: profile?.totalExperience ?? "—" },
              { label: "Applications", value: applicationCount },
              { label: "Resume versions", value: resumes.length },
              { label: "Member since", value: formatDate(user.createdAt) },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">{stat.label}</p>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-[12px] leading-relaxed text-muted-strong">
                {profile?.bio ??
                  "Add a short summary of who you are, the problems you like solving, and what you're looking for next."}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile?.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-border bg-surface-muted px-2 py-1 text-[10.5px] text-muted-strong"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume versions</CardTitle>
              <span className="text-[10px] text-muted">{resumes.length} files</span>
            </CardHeader>
            <CardContent className="pt-4">
              <ResumeManager resumes={resumes} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {[
                { icon: Mail, label: "Email", value: user.email },
                { icon: Phone, label: "Phone", value: profile?.phone ?? "Not added" },
                { icon: LinkedinIcon, label: "LinkedIn", value: profile?.linkedinUrl ? "View profile" : "Not added" },
                { icon: GithubIcon, label: "GitHub", value: profile?.githubUrl ? "View profile" : "Not added" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-muted text-muted">
                    <item.icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">{item.label}</p>
                    <p className="truncate text-[11.5px] text-foreground-soft">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Preferred roles</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile?.preferredRoles.map((role) => (
                    <Badge key={role} variant="brand">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Locations</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile?.preferredLocations.map((location) => (
                    <Badge key={location}>{location}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Expected salary</p>
                  <p className="mt-1 text-[11.5px] font-medium text-foreground">{profile?.expectedSalary ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Notice period</p>
                  <p className="mt-1 text-[11.5px] font-medium text-foreground">{profile?.noticePeriod ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2.5 rounded-xl border border-brand/15 bg-brand-soft/50 px-4 py-3">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <p className="text-[10.5px] leading-relaxed text-muted-strong">
              A strong profile makes outreach easier. Keep your resume versions and preferences current before your next application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
