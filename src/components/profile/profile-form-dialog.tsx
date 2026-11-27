"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkMode } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WORK_MODE_OPTIONS } from "@/lib/constants";
import { patchJson } from "@/lib/client-api";

export type ProfileFormValues = {
  headline?: string | null;
  location?: string | null;
  openToWork?: boolean;
  currentDesignation?: string | null;
  totalExperience?: string | null;
  currentCompany?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  preferredRoles?: string[];
  preferredLocations?: string[];
  workMode?: WorkMode | null;
  expectedSalary?: string | null;
  noticePeriod?: string | null;
  skills?: string[];
  bio?: string | null;
  projectsAchievements?: string | null;
  updatedAt?: Date | string;
};

function Field({
  label,
  children,
  className,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-strong">
      {children}
    </p>
  );
}

function splitList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProfileFormDialog({
  open,
  onOpenChange,
  name,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  profile?: ProfileFormValues | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workMode, setWorkMode] = React.useState<WorkMode | "">(profile?.workMode ?? "");

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(formEvent.currentTarget);

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      headline: fd.get("headline"),
      location: fd.get("location"),
      openToWork: fd.has("openToWork"),
      currentDesignation: fd.get("currentDesignation"),
      totalExperience: fd.get("totalExperience"),
      currentCompany: fd.get("currentCompany"),
      linkedinUrl: fd.get("linkedinUrl"),
      githubUrl: fd.get("githubUrl"),
      preferredRoles: splitList(fd.get("preferredRoles")),
      preferredLocations: splitList(fd.get("preferredLocations")),
      workMode: workMode || null,
      expectedSalary: fd.get("expectedSalary"),
      noticePeriod: fd.get("noticePeriod"),
      skills: splitList(fd.get("skills")),
      bio: fd.get("bio"),
      projectsAchievements: fd.get("projectsAchievements"),
    };

    try {
      await patchJson("/api/profile", payload);
      toast.success("Profile updated");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your private career profile and job preferences. Nothing here is public.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <SectionTitle>Professional information</SectionTitle>

            <Field label="Full name">
              <Input name="name" defaultValue={name} placeholder="Your full name" required minLength={2} maxLength={80} />
            </Field>

            <Field label="Professional headline">
              <Input
                name="headline"
                defaultValue={profile?.headline ?? ""}
                placeholder="DevOps Engineer · Cloud Infrastructure"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <Input name="location" defaultValue={profile?.location ?? ""} placeholder="City, Country" />
              </Field>
              <Field label="Total experience">
                <Input name="totalExperience" defaultValue={profile?.totalExperience ?? ""} placeholder="5 years" />
              </Field>
              <Field label="Current role">
                <Input
                  name="currentDesignation"
                  defaultValue={profile?.currentDesignation ?? ""}
                  placeholder="Your current designation"
                />
              </Field>
              <Field label="Current company">
                <Input name="currentCompany" defaultValue={profile?.currentCompany ?? ""} placeholder="Current employer" />
              </Field>
              <Field label="LinkedIn URL">
                <Input
                  name="linkedinUrl"
                  type="url"
                  defaultValue={profile?.linkedinUrl ?? ""}
                  placeholder="https://linkedin.com/in/you"
                />
              </Field>
              <Field label="GitHub URL">
                <Input
                  name="githubUrl"
                  type="url"
                  defaultValue={profile?.githubUrl ?? ""}
                  placeholder="https://github.com/you"
                />
              </Field>
            </div>

            <Field label="Professional summary">
              <Textarea
                name="bio"
                rows={4}
                defaultValue={profile?.bio ?? ""}
                placeholder="A short summary of your experience and focus."
              />
            </Field>

            <Field label="Technical skills" hint="Separate multiple skills with commas.">
              <Input name="skills" defaultValue={profile?.skills?.join(", ") ?? ""} placeholder="Kubernetes, AWS, Terraform" />
            </Field>

            <Field label="Projects and achievements">
              <Textarea
                name="projectsAchievements"
                rows={4}
                defaultValue={profile?.projectsAchievements ?? ""}
                placeholder="Notable projects, impact and achievements."
              />
            </Field>

            <label className="flex w-fit items-center gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2">
              <input
                type="checkbox"
                name="openToWork"
                defaultChecked={profile?.openToWork ?? false}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-[12px] font-medium text-foreground">Open to work</span>
            </label>

            <SectionTitle>Job preferences</SectionTitle>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred roles" hint="Separate multiple roles with commas." className="sm:col-span-2">
                <Input
                  name="preferredRoles"
                  defaultValue={profile?.preferredRoles?.join(", ") ?? ""}
                  placeholder="DevOps Engineer, SRE, Platform Engineer"
                />
              </Field>
              <Field label="Preferred locations" hint="Separate multiple locations with commas." className="sm:col-span-2">
                <Input
                  name="preferredLocations"
                  defaultValue={profile?.preferredLocations?.join(", ") ?? ""}
                  placeholder="Remote, Bengaluru, Hybrid"
                />
              </Field>
              <Field label="Work mode">
                <Select value={workMode} onValueChange={(value) => setWorkMode(value as WorkMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Expected salary">
                <Input name="expectedSalary" defaultValue={profile?.expectedSalary ?? ""} placeholder="Expected compensation" />
              </Field>
              <Field label="Notice period">
                <Input name="noticePeriod" defaultValue={profile?.noticePeriod ?? ""} placeholder="Notice period" />
              </Field>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
