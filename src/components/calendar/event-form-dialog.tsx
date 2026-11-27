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
import { patchJson, postJson } from "@/lib/client-api";
import { EVENT_TYPE_OPTIONS } from "@/lib/constants";

export type EventFormValues = {
  id?: string;
  title?: string | null;
  type?: "HR_FOLLOW_UP" | "RECRUITER_FOLLOW_UP" | "INTERVIEW" | "TECHNICAL_ASSESSMENT" | "APPLICATION_DEADLINE" | "NETWORKING" | "CUSTOM";
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  allDay?: boolean;
  companyId?: string | null;
  contactId?: string | null;
  applicationId?: string | null;
  description?: string | null;
  completed?: boolean;
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

function defaultDateTime() {
  return format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");
}

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

export function EventFormDialog({
  open,
  onOpenChange,
  companies,
  contacts,
  applications,
  event,
  defaultCompanyId,
  defaultContactId,
  defaultApplicationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: { id: string; name: string }[];
  contacts: { id: string; fullName: string; designation: string | null }[];
  applications: { id: string; title: string }[];
  event?: EventFormValues | null;
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultApplicationId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState(event?.companyId ?? defaultCompanyId ?? "none");
  const [contactId, setContactId] = React.useState(event?.contactId ?? defaultContactId ?? "none");
  const [applicationId, setApplicationId] = React.useState(event?.applicationId ?? defaultApplicationId ?? "none");
  const isEdit = Boolean(event?.id);

  React.useEffect(() => {
    if (!open) return;
    setCompanyId(event?.companyId ?? defaultCompanyId ?? "none");
    setContactId(event?.contactId ?? defaultContactId ?? "none");
    setApplicationId(event?.applicationId ?? defaultApplicationId ?? "none");
  }, [open, event, defaultCompanyId, defaultContactId, defaultApplicationId]);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(formEvent.currentTarget);

    const payload = {
      title: fd.get("title"),
      type: fd.get("type"),
      startAt: toIso(fd.get("startAt")),
      endAt: toIso(fd.get("endAt")),
      allDay: fd.get("allDay") === "on",
      companyId: companyId === "none" ? null : companyId,
      contactId: contactId === "none" ? null : contactId,
      applicationId: applicationId === "none" ? null : applicationId,
      description: fd.get("description"),
      completed: fd.get("completed") === "on",
    };

    try {
      if (event?.id) await patchJson(`/api/events/${event.id}`, payload);
      else await postJson("/api/events", payload);
      toast.success(event?.id ? "Event updated" : "Follow-up scheduled");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit event" : "Schedule a follow-up"}</DialogTitle>
          <DialogDescription>
            Interviews, deadlines and reminders — all in one calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <Input name="title" defaultValue={event?.title ?? ""} placeholder="e.g. Follow up with Sarah" required autoFocus />
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue={event?.type ?? "HR_FOLLOW_UP"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Company">
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Starts at">
                <Input name="startAt" type="datetime-local" defaultValue={toDateTimeInput(event?.startAt) || defaultDateTime()} required />
              </Field>
              <Field label="Ends at">
                <Input name="endAt" type="datetime-local" defaultValue={toDateTimeInput(event?.endAt)} />
              </Field>
              <Field label="Contact">
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contact</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.fullName}
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
                    <SelectItem value="none">No application</SelectItem>
                    {applications.map((application) => (
                      <SelectItem key={application.id} value={application.id}>
                        {application.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
              <label className="flex items-center gap-2 text-[11px] text-muted-strong">
                <input name="allDay" type="checkbox" defaultChecked={event?.allDay ?? false} className="h-3.5 w-3.5" />
                All-day event
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-strong">
                <input name="completed" type="checkbox" defaultChecked={event?.completed ?? false} className="h-3.5 w-3.5" />
                Completed
              </label>
            </div>

            <Field label="Description">
              <Textarea name="description" rows={3} defaultValue={event?.description ?? ""} placeholder="Anything you want to remember about this event" />
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
