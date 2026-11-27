"use client";

import * as React from "react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PersistentForm } from "@/components/forms/persistent-form";
import { patchJson, postJson } from "@/lib/client-api";
import { APPLICATION_STATUS_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/constants";

export type ApplicationFormValues = {
  id?: string;
  companyId?: string | null;
  title?: string | null;
  description?: string | null;
  postingUrl?: string | null;
  careersUrl?: string | null;
  location?: string | null;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE";
  employmentType?: string | null;
  salaryRange?: string | null;
  dateApplied?: Date | string | null;
  resumeId?: string | null;
  referralSource?: string | null;
  status?: "INTERESTED" | "PREPARING" | "APPLIED" | "HR_CONTACTED" | "RECRUITER_SCREENING" | "TECHNICAL_INTERVIEW" | "MANAGERIAL_INTERVIEW" | "FINAL_INTERVIEW" | "OFFER_RECEIVED" | "REJECTED" | "WITHDRAWN";
  nextFollowUp?: Date | string | null;
  notes?: string | null;
};

function toIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd");
}

function toDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd'T'HH:mm");
}

function Field({
  label,
  children,
  hint,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function ApplicationFormDialog({
  open,
  onOpenChange,
  companies,
  resumes,
  application,
  defaultCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: { id: string; name: string }[];
  resumes: { id: string; name: string }[];
  application?: ApplicationFormValues | null;
  defaultCompanyId?: string;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState(application?.companyId ?? defaultCompanyId ?? "");
  const [resumeId, setResumeId] = React.useState(application?.resumeId ?? "none");
  const isEdit = Boolean(application?.id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(event.currentTarget);

    const payload = {
      companyId: companyId || "",
      title: fd.get("title"),
      description: fd.get("description"),
      postingUrl: fd.get("postingUrl"),
      careersUrl: fd.get("careersUrl"),
      location: fd.get("location"),
      workMode: fd.get("workMode"),
      employmentType: fd.get("employmentType") || "Full-time",
      salaryRange: fd.get("salaryRange"),
      dateApplied: toIso(fd.get("dateApplied")),
      resumeId: resumeId === "none" ? null : resumeId,
      referralSource: fd.get("referralSource"),
      status: fd.get("status"),
      nextFollowUp: toIso(fd.get("nextFollowUp")),
      notes: fd.get("notes"),
    };

    try {
      const result = application?.id
        ? await patchJson<{ application: { id: string } }>(`/api/applications/${application.id}`, payload)
        : await postJson<{ application: { id: string } }>("/api/applications", payload);
      toast.success(application?.id ? "Application updated" : "Application added to your pipeline");
      router.refresh();
      onOpenChange(false);
      onSaved?.(result.application.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save application");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit application" : "Add an application"}</DialogTitle>
          <DialogDescription>
            Track the role, where it came from and exactly where it stands in your pipeline.
          </DialogDescription>
        </DialogHeader>

        <PersistentForm draftKey={`application:${application?.id ?? "new"}`} onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title" className="sm:col-span-2">
                <Input name="title" defaultValue={application?.title ?? ""} placeholder="e.g. Senior Site Reliability Engineer" required autoFocus />
              </Field>
              <Field label="Company" required>
                <Select required name="companyId" value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={application?.status ?? "INTERESTED"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Job posting URL">
                <Input name="postingUrl" type="url" defaultValue={application?.postingUrl ?? ""} placeholder="https://…" />
              </Field>
              <Field label="Careers page URL">
                <Input name="careersUrl" type="url" defaultValue={application?.careersUrl ?? ""} placeholder="https://…" />
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={application?.location ?? ""} placeholder="Bengaluru · India" />
              </Field>
              <Field label="Work mode">
                <Select name="workMode" defaultValue={application?.workMode ?? "REMOTE"}>
                  <SelectTrigger>
                    <SelectValue />
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
              <Field label="Employment type">
                <Input name="employmentType" defaultValue={application?.employmentType ?? "Full-time"} placeholder="Full-time" />
              </Field>
              <Field label="Salary range">
                <Input name="salaryRange" defaultValue={application?.salaryRange ?? ""} placeholder="₹35–45 LPA" />
              </Field>
              <Field label="Date applied">
                <Input name="dateApplied" type="date" defaultValue={toDateInput(application?.dateApplied)} />
              </Field>
              <Field label="Next follow-up">
                <Input name="nextFollowUp" type="datetime-local" defaultValue={toDateTimeInput(application?.nextFollowUp)} />
              </Field>
              <Field label="Referral source">
                <Input name="referralSource" defaultValue={application?.referralSource ?? ""} placeholder="Who pointed you to this role?" />
              </Field>
              <Field label="Resume">
                <Select name="resumeId" value={resumeId} onValueChange={setResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No resume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No resume</SelectItem>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <Textarea name="description" rows={3} defaultValue={application?.description ?? ""} placeholder="Role summary, requirements, anything useful…" />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" rows={3} defaultValue={application?.notes ?? ""} placeholder="Preparation notes, questions to ask, interview feedback…" />
            </Field>

            {error && (
              <div className="rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </PersistentForm>
      </DialogContent>
    </Dialog>
  );
}
