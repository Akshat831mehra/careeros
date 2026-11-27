"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { patchJson } from "@/lib/client-api";

export type ProfileFormValues = {
  headline?: string | null;
  phone?: string | null;
  currentDesignation?: string | null;
  totalExperience?: string | null;
  currentCompany?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  preferredRoles?: string[];
  preferredLocations?: string[];
  expectedSalary?: string | null;
  noticePeriod?: string | null;
  skills?: string[];
  bio?: string | null;
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
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ProfileFormValues | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(formEvent.currentTarget);

    const payload = {
      headline: fd.get("headline"),
      phone: fd.get("phone"),
      currentDesignation: fd.get("currentDesignation"),
      totalExperience: fd.get("totalExperience"),
      currentCompany: fd.get("currentCompany"),
      linkedinUrl: fd.get("linkedinUrl"),
      githubUrl: fd.get("githubUrl"),
      portfolioUrl: fd.get("portfolioUrl"),
      preferredRoles: splitList(fd.get("preferredRoles")),
      preferredLocations: splitList(fd.get("preferredLocations")),
      expectedSalary: fd.get("expectedSalary"),
      noticePeriod: fd.get("noticePeriod"),
      skills: splitList(fd.get("skills")),
      bio: fd.get("bio"),
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
            Keep your headline, preferences and links current — they power your outreach and applications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <Field label="Headline">
              <Input name="headline" defaultValue={profile?.headline ?? ""} placeholder="Senior DevOps Engineer · Kubernetes & AWS" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current designation">
                <Input name="currentDesignation" defaultValue={profile?.currentDesignation ?? ""} placeholder="Senior DevOps Engineer" />
              </Field>
              <Field label="Current company">
                <Input name="currentCompany" defaultValue={profile?.currentCompany ?? ""} placeholder="Acme Corp" />
              </Field>
              <Field label="Total experience">
                <Input name="totalExperience" defaultValue={profile?.totalExperience ?? ""} placeholder="6 years" />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+1 555 010 2030" />
              </Field>
              <Field label="LinkedIn URL">
                <Input name="linkedinUrl" type="url" defaultValue={profile?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/you" />
              </Field>
              <Field label="GitHub URL">
                <Input name="githubUrl" type="url" defaultValue={profile?.githubUrl ?? ""} placeholder="https://github.com/you" />
              </Field>
              <Field label="Portfolio URL" className="sm:col-span-2">
                <Input name="portfolioUrl" type="url" defaultValue={profile?.portfolioUrl ?? ""} placeholder="https://your-portfolio.dev" />
              </Field>
              <Field label="Preferred roles" hint="Separate multiple roles with commas." className="sm:col-span-2">
                <Input name="preferredRoles" defaultValue={profile?.preferredRoles?.join(", ") ?? ""} placeholder="DevOps Engineer, SRE, Platform Engineer" />
              </Field>
              <Field label="Preferred locations" hint="Separate multiple locations with commas." className="sm:col-span-2">
                <Input name="preferredLocations" defaultValue={profile?.preferredLocations?.join(", ") ?? ""} placeholder="Remote, San Francisco, London" />
              </Field>
              <Field label="Skills" hint="Separate multiple skills with commas.">
                <Input name="skills" defaultValue={profile?.skills?.join(", ") ?? ""} placeholder="Kubernetes, AWS, Terraform" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expected salary">
                  <Input name="expectedSalary" defaultValue={profile?.expectedSalary ?? ""} placeholder="$150k–$180k" />
                </Field>
                <Field label="Notice period">
                  <Input name="noticePeriod" defaultValue={profile?.noticePeriod ?? ""} placeholder="2 weeks" />
                </Field>
              </div>
            </div>

            <Field label="Bio">
              <Textarea
                name="bio"
                rows={4}
                defaultValue={profile?.bio ?? ""}
                placeholder="A short summary of who you are and what you're looking for next."
              />
            </Field>

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
