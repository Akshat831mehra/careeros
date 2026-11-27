"use client";

import * as React from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";
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
import { patchJson, postJson } from "@/lib/client-api";
import {
  OUTREACH_CHANNEL_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
} from "@/lib/constants";

export type OutreachFormValues = {
  id?: string;
  contactId?: string | null;
  companyId?: string | null;
  applicationId?: string | null;
  channel?: "COLD_EMAIL" | "LINKEDIN_CONNECTION" | "LINKEDIN_MESSAGE" | "REFERRAL_REQUEST" | "HR_FOLLOW_UP";
  subject?: string | null;
  message?: string | null;
  sentAt?: Date | string | null;
  status?: "DRAFT" | "READY_TO_SEND" | "SENT" | "AWAITING_RESPONSE" | "REPLIED" | "FOLLOW_UP_DUE" | "COMPLETED";
  responseStatus?: string | null;
  nextFollowUp?: Date | string | null;
  notes?: string | null;
};

function toIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd'T'HH:mm");
}

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

export function OutreachFormDialog({
  open,
  onOpenChange,
  contacts,
  companies,
  applications,
  templates,
  record,
  defaultContactId,
  defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: { id: string; fullName: string; companyId: string | null; designation: string | null }[];
  companies: { id: string; name: string }[];
  applications: { id: string; title: string; companyId: string }[];
  templates: { id: string; name: string; category: string; subject: string; body: string }[];
  record?: OutreachFormValues | null;
  defaultContactId?: string;
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [contactId, setContactId] = React.useState(record?.contactId ?? defaultContactId ?? "");
  const [companyId, setCompanyId] = React.useState(record?.companyId ?? defaultCompanyId ?? "");
  const [applicationId, setApplicationId] = React.useState(record?.applicationId ?? "none");
  const [subject, setSubject] = React.useState(record?.subject ?? "");
  const [message, setMessage] = React.useState(record?.message ?? "");
  const isEdit = Boolean(record?.id);

  React.useEffect(() => {
    if (!open) return;
    const contact = contacts.find((item) => item.id === (record?.contactId ?? defaultContactId));
    setContactId(record?.contactId ?? defaultContactId ?? "");
    setCompanyId(record?.companyId ?? defaultCompanyId ?? contact?.companyId ?? "");
    setApplicationId(record?.applicationId ?? "none");
    setSubject(record?.subject ?? "");
    setMessage(record?.message ?? "");
  }, [open, record, defaultContactId, defaultCompanyId, contacts]);

  function applyTemplate(templateId: string) {
    if (templateId === "none") return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    setMessage(template.body);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(event.currentTarget);

    const payload = {
      contactId: contactId || "",
      companyId: companyId || "",
      applicationId: applicationId === "none" ? null : applicationId,
      channel: fd.get("channel"),
      subject,
      message,
      sentAt: toIso(fd.get("sentAt")),
      status: fd.get("status"),
      responseStatus: fd.get("responseStatus"),
      nextFollowUp: toIso(fd.get("nextFollowUp")),
      notes: fd.get("notes"),
    };

    try {
      if (record?.id) await patchJson(`/api/outreach/${record.id}`, payload);
      else await postJson("/api/outreach", payload);
      toast.success(record?.id ? "Outreach updated" : "Outreach logged");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save outreach");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit outreach" : "Log outreach"}</DialogTitle>
          <DialogDescription>
            Capture the message, channel and current state of the conversation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact" className="sm:col-span-2">
                <Select required value={contactId} onValueChange={(value) => {
                  setContactId(value);
                  const contact = contacts.find((item) => item.id === value);
                  if (contact?.companyId && !companyId) setCompanyId(contact.companyId);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.fullName}
                        {contact.designation ? ` · ${contact.designation}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Company">
                <Select required value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a company" />
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
              <Field label="Application">
                <Select value={applicationId} onValueChange={setApplicationId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked application</SelectItem>
                    {applications.map((application) => (
                      <SelectItem key={application.id} value={application.id}>
                        {application.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Channel">
                <Select name="channel" defaultValue={record?.channel ?? "COLD_EMAIL"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTREACH_CHANNEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={record?.status ?? "DRAFT"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTREACH_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sent at">
                <Input name="sentAt" type="datetime-local" defaultValue={toDateTimeInput(record?.sentAt)} />
              </Field>
              <Field label="Next follow-up">
                <Input name="nextFollowUp" type="datetime-local" defaultValue={toDateTimeInput(record?.nextFollowUp)} />
              </Field>
              <Field label="Response status" className="sm:col-span-2">
                <Input name="responseStatus" defaultValue={record?.responseStatus ?? ""} placeholder="e.g. Positive, asked for resume" />
              </Field>
            </div>

            {templates.length > 0 && !isEdit && (
              <Field label="Start from a template" hint="Optional — replaces the subject and message below.">
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Blank message</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} · {template.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Subject">
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Quick question about the Platform role" />
            </Field>
            <Field label="Message">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                required
                placeholder="Hi Sarah, I came across the Platform Engineer role…"
              />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" rows={2} defaultValue={record?.notes ?? ""} placeholder="Internal notes about this conversation" />
            </Field>

            {templates.length > 0 && !isEdit && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                <Sparkles className="h-3 w-3 text-brand" />
                Templates are starting points — edit freely before saving.
              </div>
            )}

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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Log outreach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
