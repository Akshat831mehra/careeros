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
import {
  PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/constants";

export type TaskFormValues = {
  id?: string;
  title?: string | null;
  description?: string | null;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  dueDate?: Date | string | null;
  companyId?: string | null;
  contactId?: string | null;
  applicationId?: string | null;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  completedAt?: Date | string | null;
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

function Field({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
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
    </div>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  companies,
  contacts,
  applications,
  task,
  defaultCompanyId,
  defaultContactId,
  defaultApplicationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: { id: string; name: string }[];
  contacts: { id: string; fullName: string; companyId: string | null }[];
  applications: { id: string; title: string; companyId: string }[];
  task?: TaskFormValues | null;
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultApplicationId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [companyId, setCompanyId] = React.useState(task?.companyId ?? defaultCompanyId ?? "none");
  const [contactId, setContactId] = React.useState(task?.contactId ?? defaultContactId ?? "none");
  const [applicationId, setApplicationId] = React.useState(task?.applicationId ?? defaultApplicationId ?? "none");
  const isEdit = Boolean(task?.id);

  React.useEffect(() => {
    if (!open) return;
    setCompanyId(task?.companyId ?? defaultCompanyId ?? "none");
    setContactId(task?.contactId ?? defaultContactId ?? "none");
    setApplicationId(task?.applicationId ?? defaultApplicationId ?? "none");
  }, [open, task, defaultCompanyId, defaultContactId, defaultApplicationId]);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(formEvent.currentTarget);

    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      priority: fd.get("priority"),
      status: fd.get("status"),
      dueDate: toIso(fd.get("dueDate")),
      companyId: companyId === "none" ? null : companyId,
      contactId: contactId === "none" ? null : contactId,
      applicationId: applicationId === "none" ? null : applicationId,
    };

    try {
      if (task?.id) await patchJson(`/api/tasks/${task.id}`, payload);
      else await postJson("/api/tasks", payload);
      toast.success(task?.id ? "Task updated" : "Task added");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>{isEdit ? "Edit task" : "Add a task"}</DialogTitle>
          <DialogDescription>
            Keep the small follow-ups and prep work attached to the right company or application.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <Field label="Title" required>
              <Input
                name="title"
                defaultValue={task?.title ?? ""}
                placeholder="e.g. Rewrite resume for DevOps roles"
                required
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority">
                <Select name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
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
                <Select name="status" defaultValue={task?.status ?? "PENDING"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due date">
                <Input name="dueDate" type="date" defaultValue={toDateInput(task?.dueDate)} />
              </Field>
              <Field label="Company">
                <Select
                  value={companyId}
                  onValueChange={(value) => {
                    setCompanyId(value);
                    const selected = companies.find((item) => item.id === value);
                    if (selected && applicationId === "none") {
                      const related = applications.find((item) => item.companyId === selected.id);
                      if (related) setApplicationId(related.id);
                    }
                  }}
                >
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

            <Field label="Description">
              <Textarea
                name="description"
                rows={4}
                defaultValue={task?.description ?? ""}
                placeholder="Anything you want to remember about this task"
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
