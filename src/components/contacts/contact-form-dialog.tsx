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
  CONTACT_TYPE_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
} from "@/lib/constants";

export type ContactFormValues = {
  id?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  companyId?: string | null;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  type?: "HR" | "RECRUITER" | "TALENT_ACQUISITION" | "ENGINEERING_MANAGER" | "DEVOPS_LEAD" | "SRE_MANAGER" | "CTO" | "SENIOR_ENGINEER" | "EMPLOYEE_REFERRAL" | "OTHER";
  relationship?: "NOT_CONTACTED" | "CONTACTED" | "CONNECTED_ON_LINKEDIN" | "REPLIED" | "FOLLOW_UP_REQUIRED" | "INTERESTED" | "NOT_INTERESTED";
  notes?: string | null;
};

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

export function ContactFormDialog({
  open,
  onOpenChange,
  companies,
  contact,
  defaultCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: { id: string; name: string }[];
  contact?: ContactFormValues | null;
  defaultCompanyId?: string;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState(contact?.companyId ?? defaultCompanyId ?? "none");
  const isEdit = Boolean(contact?.id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(event.currentTarget);

    const payload = {
      fullName: fd.get("fullName"),
      avatarUrl: fd.get("avatarUrl"),
      companyId: companyId === "none" ? null : companyId,
      designation: fd.get("designation"),
      department: fd.get("department"),
      email: fd.get("email"),
      linkedinUrl: fd.get("linkedinUrl"),
      phone: fd.get("phone"),
      type: fd.get("type"),
      relationship: fd.get("relationship"),
      notes: fd.get("notes"),
    };

    try {
      const result = contact?.id
        ? await patchJson<{ contact: { id: string } }>(`/api/contacts/${contact.id}`, payload)
        : await postJson<{ contact: { id: string } }>("/api/contacts", payload);
      toast.success(contact?.id ? "Contact updated" : "Contact added to your network");
      router.refresh();
      onOpenChange(false);
      onSaved?.(result.contact.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contact");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit contact" : "Add a contact"}</DialogTitle>
          <DialogDescription>
            Keep recruiters, hiring managers and employees you know in one place.
          </DialogDescription>
        </DialogHeader>

        <PersistentForm draftKey={`contact:${contact?.id ?? "new"}`} onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2">
                <Input name="fullName" defaultValue={contact?.fullName ?? ""} placeholder="e.g. Sarah Chen" required autoFocus />
              </Field>
              <Field label="Company">
                <Select name="companyId" value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Designation">
                <Input name="designation" defaultValue={contact?.designation ?? ""} placeholder="Senior Technical Recruiter" />
              </Field>
              <Field label="Department">
                <Input name="department" defaultValue={contact?.department ?? ""} placeholder="Talent" />
              </Field>
              <Field label="Contact type">
                <Select name="type" defaultValue={contact?.type ?? "RECRUITER"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Relationship">
                <Select name="relationship" defaultValue={contact?.relationship ?? "NOT_CONTACTED"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Email">
                <Input name="email" type="email" defaultValue={contact?.email ?? ""} placeholder="name@company.com" />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={contact?.phone ?? ""} placeholder="+91 98765 43210" />
              </Field>
              <Field label="LinkedIn URL" className="sm:col-span-2">
                <Input name="linkedinUrl" type="url" defaultValue={contact?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/…" />
              </Field>
              <Field label="Profile picture URL" className="sm:col-span-2">
                <Input name="avatarUrl" type="url" defaultValue={contact?.avatarUrl ?? ""} placeholder="https://…" />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                name="notes"
                rows={3}
                defaultValue={contact?.notes ?? ""}
                placeholder="How do you know this person? What should you remember?"
              />
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </PersistentForm>
      </DialogContent>
    </Dialog>
  );
}
