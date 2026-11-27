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
import {
  COMPANY_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/constants";

export type CompanyFormValues = {
  id?: string;
  name?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  careersUrl?: string | null;
  linkedinUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  size?: string | null;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  status?: "TARGET" | "CONTACTED" | "APPLIED" | "NOT_INTERESTED";
  notes?: string | null;
};

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyFormValues | null;
  onSaved?: (companyId: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isEdit = Boolean(company?.id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: fd.get("name"),
      logoUrl: fd.get("logoUrl"),
      website: fd.get("website"),
      careersUrl: fd.get("careersUrl"),
      linkedinUrl: fd.get("linkedinUrl"),
      industry: fd.get("industry"),
      location: fd.get("location"),
      size: fd.get("size"),
      priority: fd.get("priority"),
      status: fd.get("status"),
      notes: fd.get("notes"),
    };

    try {
      const result = company?.id
        ? await patchJson<{ company: { id: string } }>(`/api/companies/${company.id}`, payload)
        : await postJson<{ company: { id: string } }>("/api/companies", payload);
      toast.success(company?.id ? "Company updated" : "Company added to your target list");
      router.refresh();
      onOpenChange(false);
      onSaved?.(result.company.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save company");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit company" : "Add a company"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this target company."
              : "Start with the basics — you can fill in the rest as you learn more."}
          </DialogDescription>
        </DialogHeader>

        <PersistentForm draftKey={`company:${company?.id ?? "new"}`} onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" className="sm:col-span-2">
                <Input name="name" defaultValue={company?.name ?? ""} placeholder="e.g. Vercel" required autoFocus />
              </Field>
              <Field label="Website">
                <Input name="website" type="url" defaultValue={company?.website ?? ""} placeholder="https://company.com" />
              </Field>
              <Field label="Careers page">
                <Input name="careersUrl" type="url" defaultValue={company?.careersUrl ?? ""} placeholder="https://company.com/careers" />
              </Field>
              <Field label="LinkedIn company URL">
                <Input
                  name="linkedinUrl"
                  type="url"
                  defaultValue={company?.linkedinUrl ?? ""}
                  placeholder="https://linkedin.com/company/…"
                />
              </Field>
              <Field label="Logo URL" hint="Optional — a link to the company's logo image">
                <Input name="logoUrl" type="url" defaultValue={company?.logoUrl ?? ""} placeholder="https://…" />
              </Field>
              <Field label="Industry">
                <Input name="industry" defaultValue={company?.industry ?? ""} placeholder="Cloud infrastructure" />
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={company?.location ?? ""} placeholder="Remote · Global" />
              </Field>
              <Field label="Company size">
                <Input name="size" defaultValue={company?.size ?? ""} placeholder="50–200" />
              </Field>
              <Field label="Priority">
                <Select name="priority" defaultValue={company?.priority ?? "MEDIUM"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={company?.status ?? "TARGET"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                name="notes"
                rows={3}
                defaultValue={company?.notes ?? ""}
                placeholder="Why are you targeting this company? Any warm intros?"
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </PersistentForm>
      </DialogContent>
    </Dialog>
  );
}
