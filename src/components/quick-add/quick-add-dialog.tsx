"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Loader2,
  Plus,
  UserRound,
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { QuickAddCompany, QuickAddContact } from "./quick-add-provider";

export type QuickAddTab = "company" | "application" | "contact" | "follow-up";

const TABS: { value: QuickAddTab; label: string; icon: React.ElementType }[] = [
  { value: "company", label: "Company", icon: Building2 },
  { value: "application", label: "Application", icon: BriefcaseBusiness },
  { value: "contact", label: "Contact", icon: UserRound },
  { value: "follow-up", label: "Follow-up", icon: CalendarClock },
];

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1">
        <Label>{label}</Label>
        {required && <span className="text-[10px] text-danger">*</span>}
      </div>
      {children}
    </div>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">
      {error}
    </div>
  );
}

function FormActions({
  pending,
  onCancel,
  submitLabel,
}: {
  pending: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {pending ? "Saving…" : submitLabel}
      </Button>
    </DialogFooter>
  );
}

export function QuickAddDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: QuickAddTab;
  onTabChange: (tab: QuickAddTab) => void;
  companies: QuickAddCompany[];
  contacts: QuickAddContact[];
  defaultCompanyId?: string;
  defaultContactId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [contactCompanyId, setContactCompanyId] = React.useState<string>(defaultCompanyId ?? "all");
  const [applicationCompanyId, setApplicationCompanyId] = React.useState<string>(defaultCompanyId ?? "");
  const [followUpCompanyId, setFollowUpCompanyId] = React.useState<string>(defaultCompanyId ?? "none");
  const [followUpContactId, setFollowUpContactId] = React.useState<string>(defaultContactId ?? "none");

  React.useEffect(() => {
    if (!open) return;
    setContactCompanyId(defaultCompanyId ?? "all");
    setApplicationCompanyId(defaultCompanyId ?? "");
    setFollowUpContactId(defaultContactId ?? "none");
    const contactCompany = contacts.find((contact) => contact.id === defaultContactId)?.companyId;
    setFollowUpCompanyId(defaultCompanyId ?? contactCompany ?? "none");
  }, [open, defaultCompanyId, defaultContactId, contacts]);

  const finish = (message: string) => {
    toast.success(message);
    router.refresh();
    onOpenChange(false);
  };

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);

    try {
      await postJson("/api/companies", {
        name: fd.get("name"),
        website: fd.get("website"),
        industry: fd.get("industry"),
        location: fd.get("location"),
        priority: fd.get("priority"),
        status: fd.get("status"),
        notes: fd.get("notes"),
      });
      form.reset();
      finish("Company added to your workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add company");
    } finally {
      setPending(false);
    }
  }

  async function createApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);

    try {
      await postJson("/api/applications", {
        companyId: fd.get("companyId"),
        title: fd.get("title"),
        postingUrl: fd.get("postingUrl"),
        location: fd.get("location"),
        workMode: fd.get("workMode"),
        salaryRange: fd.get("salaryRange"),
        dateApplied: toIso(String(fd.get("dateApplied") ?? "")),
        status: fd.get("status"),
        nextFollowUp: toIso(String(fd.get("nextFollowUp") ?? "")),
        notes: fd.get("notes"),
      });
      form.reset();
      finish("Application added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add application");
    } finally {
      setPending(false);
    }
  }

  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);

    try {
      await postJson("/api/contacts", {
        fullName: fd.get("fullName"),
        companyId: contactCompanyId === "all" ? undefined : contactCompanyId,
        designation: fd.get("designation"),
        department: fd.get("department"),
        email: fd.get("email"),
        linkedinUrl: fd.get("linkedinUrl"),
        phone: fd.get("phone"),
        type: fd.get("type"),
        relationship: fd.get("relationship"),
        notes: fd.get("notes"),
      });
      form.reset();
      setContactCompanyId("all");
      finish("Contact added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add contact");
    } finally {
      setPending(false);
    }
  }

  async function createFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);

    try {
      await postJson("/api/events", {
        title: fd.get("title"),
        type: fd.get("type"),
        startAt: toIso(String(fd.get("startAt") ?? "")),
        companyId: fd.get("companyId") === "none" ? undefined : fd.get("companyId"),
        contactId: followUpContactId === "none" ? undefined : followUpContactId,
        description: fd.get("description"),
      });
      form.reset();
      finish("Follow-up scheduled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule follow-up");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-surface-muted/40">
          <DialogTitle>Quick add</DialogTitle>
          <DialogDescription>Capture something now. You can add more detail later.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => {
              setError(null);
              onTabChange(value as QuickAddTab);
            }} className="gap-0">
          <div className="border-b border-border px-5 pt-4">
            <TabsList className="grid w-full grid-cols-4 bg-transparent p-0">
              {TABS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 pb-3 pt-2 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="max-h-[68vh] overflow-y-auto">
            <TabsContent value="company" className="mt-0">
              <form onSubmit={createCompany}>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company name" required>
                      <Input name="name" placeholder="e.g. Vercel" required autoFocus />
                    </Field>
                    <Field label="Website">
                      <Input name="website" type="url" placeholder="https://company.com" />
                    </Field>
                    <Field label="Industry">
                      <Input name="industry" placeholder="Developer tools" />
                    </Field>
                    <Field label="Location">
                      <Input name="location" placeholder="Remote · Global" />
                    </Field>
                    <Field label="Priority">
                      <Select name="priority" defaultValue="MEDIUM">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select name="status" defaultValue="TARGET">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TARGET">Target</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="APPLIED">Applied</SelectItem>
                          <SelectItem value="NOT_INTERESTED">Not interested</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Notes">
                    <Textarea name="notes" placeholder="Why does this company interest you?" />
                  </Field>
                  <FormError error={error} />
                </div>
                <FormActions pending={pending} onCancel={() => onOpenChange(false)} submitLabel="Add company" />
              </form>
            </TabsContent>

            <TabsContent value="application" className="mt-0">
              <form onSubmit={createApplication}>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company" required>
                      <Select
                        name="companyId"
                        required
                        value={applicationCompanyId}
                        onValueChange={setApplicationCompanyId}
                      >
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
                    <Field label="Job title" required>
                      <Input name="title" placeholder="e.g. Senior SRE" required />
                    </Field>
                    <Field label="Job posting URL">
                      <Input name="postingUrl" type="url" placeholder="https://…" />
                    </Field>
                    <Field label="Location">
                      <Input name="location" placeholder="Remote · India" />
                    </Field>
                    <Field label="Work mode">
                      <Select name="workMode" defaultValue="REMOTE">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REMOTE">Remote</SelectItem>
                          <SelectItem value="HYBRID">Hybrid</SelectItem>
                          <SelectItem value="ONSITE">On-site</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select name="status" defaultValue="INTERESTED">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERESTED">Interested</SelectItem>
                          <SelectItem value="PREPARING">Preparing</SelectItem>
                          <SelectItem value="APPLIED">Applied</SelectItem>
                          <SelectItem value="HR_CONTACTED">HR contacted</SelectItem>
                          <SelectItem value="RECRUITER_SCREENING">Recruiter screening</SelectItem>
                          <SelectItem value="TECHNICAL_INTERVIEW">Technical interview</SelectItem>
                          <SelectItem value="MANAGERIAL_INTERVIEW">Managerial interview</SelectItem>
                          <SelectItem value="FINAL_INTERVIEW">Final interview</SelectItem>
                          <SelectItem value="OFFER_RECEIVED">Offer received</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date applied">
                      <Input name="dateApplied" type="date" />
                    </Field>
                    <Field label="Next follow-up">
                      <Input name="nextFollowUp" type="datetime-local" />
                    </Field>
                    <Field label="Salary range" className="sm:col-span-2">
                      <Input name="salaryRange" placeholder="e.g. ₹35–45 LPA" />
                    </Field>
                  </div>
                  <Field label="Notes">
                    <Textarea name="notes" placeholder="Anything worth remembering about this role?" />
                  </Field>
                  <FormError error={error} />
                </div>
                <FormActions pending={pending} onCancel={() => onOpenChange(false)} submitLabel="Add application" />
              </form>
            </TabsContent>

            <TabsContent value="contact" className="mt-0">
              <form onSubmit={createContact}>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" required>
                      <Input name="fullName" placeholder="e.g. Sarah Chen" required />
                    </Field>
                    <Field label="Company">
                      <Select value={contactCompanyId} onValueChange={setContactCompanyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="No company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">No company</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Designation">
                      <Input name="designation" placeholder="Technical Recruiter" />
                    </Field>
                    <Field label="Department">
                      <Input name="department" placeholder="Talent" />
                    </Field>
                    <Field label="Contact type">
                      <Select name="type" defaultValue="RECRUITER">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="RECRUITER">Recruiter</SelectItem>
                          <SelectItem value="TALENT_ACQUISITION">Talent acquisition</SelectItem>
                          <SelectItem value="ENGINEERING_MANAGER">Engineering manager</SelectItem>
                          <SelectItem value="DEVOPS_LEAD">DevOps lead</SelectItem>
                          <SelectItem value="SRE_MANAGER">SRE manager</SelectItem>
                          <SelectItem value="CTO">CTO</SelectItem>
                          <SelectItem value="SENIOR_ENGINEER">Senior engineer</SelectItem>
                          <SelectItem value="EMPLOYEE_REFERRAL">Employee referral</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Relationship">
                      <Select name="relationship" defaultValue="NOT_CONTACTED">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOT_CONTACTED">Not contacted</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="CONNECTED_ON_LINKEDIN">Connected on LinkedIn</SelectItem>
                          <SelectItem value="REPLIED">Replied</SelectItem>
                          <SelectItem value="FOLLOW_UP_REQUIRED">Follow-up required</SelectItem>
                          <SelectItem value="INTERESTED">Interested</SelectItem>
                          <SelectItem value="NOT_INTERESTED">Not interested</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Email">
                      <Input name="email" type="email" placeholder="name@company.com" />
                    </Field>
                    <Field label="LinkedIn URL">
                      <Input name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" />
                    </Field>
                    <Field label="Phone">
                      <Input name="phone" placeholder="+91 98765 43210" />
                    </Field>
                  </div>
                  <Field label="Notes">
                    <Textarea name="notes" placeholder="How do you know this person? What should you remember?" />
                  </Field>
                  <FormError error={error} />
                </div>
                <FormActions pending={pending} onCancel={() => onOpenChange(false)} submitLabel="Add contact" />
              </form>
            </TabsContent>

            <TabsContent value="follow-up" className="mt-0">
              <form onSubmit={createFollowUp}>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title" required className="sm:col-span-2">
                      <Input name="title" placeholder="e.g. Follow up with Sarah Chen" required />
                    </Field>
                    <Field label="Type">
                      <Select name="type" defaultValue="HR_FOLLOW_UP">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HR_FOLLOW_UP">HR follow-up</SelectItem>
                          <SelectItem value="RECRUITER_FOLLOW_UP">Recruiter follow-up</SelectItem>
                          <SelectItem value="INTERVIEW">Interview</SelectItem>
                          <SelectItem value="TECHNICAL_ASSESSMENT">Technical assessment</SelectItem>
                          <SelectItem value="APPLICATION_DEADLINE">Application deadline</SelectItem>
                          <SelectItem value="NETWORKING">Networking reminder</SelectItem>
                          <SelectItem value="CUSTOM">Custom task</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Date & time" required>
                      <Input name="startAt" type="datetime-local" required />
                    </Field>
                    <Field label="Company">
                      <Select name="companyId" value={followUpCompanyId} onValueChange={setFollowUpCompanyId}>
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
                      <Select name="contactId" value={followUpContactId} onValueChange={setFollowUpContactId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No contact</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.fullName}
                              {contact.designation ? ` · ${contact.designation}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Description">
                    <Textarea name="description" placeholder="What needs to happen?" />
                  </Field>
                  <FormError error={error} />
                </div>
                <FormActions pending={pending} onCancel={() => onOpenChange(false)} submitLabel="Schedule follow-up" />
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
