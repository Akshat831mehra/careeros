"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Plus,
  Reply,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListToolbar } from "@/components/modules/list-toolbar";
import {
  OutreachFormDialog,
  type OutreachFormValues,
} from "@/components/outreach/outreach-form-dialog";
import { deleteJson, patchJson } from "@/lib/client-api";
import {
  OUTREACH_CHANNEL_LABELS,
  OUTREACH_CHANNEL_OPTIONS,
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_STATUS_VARIANTS,
} from "@/lib/constants";
import { cn, formatShortDate, initials } from "@/lib/utils";

export type OutreachRow = OutreachFormValues & {
  id: string;
  message: string;
  channel: keyof typeof OUTREACH_CHANNEL_LABELS;
  status: keyof typeof OUTREACH_STATUS_LABELS;
  createdAt: Date | string;
  contact: { id: string; fullName: string; designation: string | null };
  company: { id: string; name: string };
  application: { id: string; title: string } | null;
};

type SortKey = "contact" | "company" | "channel" | "status" | "sentAt" | "nextFollowUp" | "createdAt";

const SORT_LABELS: Record<SortKey, string> = {
  contact: "Contact",
  company: "Company",
  channel: "Channel",
  status: "Status",
  sentAt: "Sent",
  nextFollowUp: "Follow-up",
  createdAt: "Logged",
};

function compareDates(a: Date | string | null | undefined, b: Date | string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left - right;
}

export function OutreachWorkspace({
  records,
  contacts,
  companies,
  applications,
  templates,
}: {
  records: OutreachRow[];
  contacts: { id: string; fullName: string; companyId: string | null; designation: string | null }[];
  companies: { id: string; name: string }[];
  applications: { id: string; title: string; companyId: string }[];
  templates: { id: string; name: string; category: string; subject: string; body: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(records);
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<OutreachRow | null>(null);
  const [deleting, setDeleting] = React.useState<OutreachRow | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(records), [records]);

  const sorted = React.useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "contact":
          comparison = a.contact.fullName.localeCompare(b.contact.fullName);
          break;
        case "company":
          comparison = a.company.name.localeCompare(b.company.name);
          break;
        case "channel":
          comparison = OUTREACH_CHANNEL_LABELS[a.channel].localeCompare(OUTREACH_CHANNEL_LABELS[b.channel]);
          break;
        case "status":
          comparison = OUTREACH_STATUS_LABELS[a.status].localeCompare(OUTREACH_STATUS_LABELS[b.status]);
          break;
        case "sentAt":
          comparison = compareDates(a.sentAt, b.sentAt);
          break;
        case "nextFollowUp":
          comparison = compareDates(a.nextFollowUp, b.nextFollowUp);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return rows;
  }, [direction, items, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection(key === "createdAt" || key === "sentAt" || key === "nextFollowUp" ? "desc" : "asc");
    }
  }

  async function updateStatus(recordId: string, status: keyof typeof OUTREACH_STATUS_LABELS) {
    const current = items.find((item) => item.id === recordId);
    if (!current || current.status === status) return;
    const previous = items;
    setUpdatingId(recordId);
    setItems((rows) => rows.map((row) => (row.id === recordId ? { ...row, status } : row)));
    try {
      await patchJson(`/api/outreach/${recordId}`, { status });
      toast.success(`Marked as ${OUTREACH_STATUS_LABELS[status].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast.error(error instanceof Error ? error.message : "Could not update outreach");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/outreach/${deleting.id}`);
      toast.success("Outreach record deleted");
      setItems((rows) => rows.filter((row) => row.id !== deleting.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete outreach");
      throw error;
    }
  }

  function SortHeader({ sort }: { sort: SortKey }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(sort)}
        className={cn(
          "inline-flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.08em] transition-colors hover:text-foreground",
          sortKey === sort ? "text-foreground" : "text-muted",
        )}
      >
        {SORT_LABELS[sort]}
        {sortKey === sort && (direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  }

  function RowActions({ record }: { record: OutreachRow }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Actions for outreach to ${record.contact.fullName}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[340px] overflow-y-auto">
          <DropdownMenuItem disabled={updatingId === record.id || record.status === "SENT"} onSelect={() => void updateStatus(record.id, "SENT")}>
            <MailCheck className="h-3 w-3" />
            Mark as sent
          </DropdownMenuItem>
          <DropdownMenuItem disabled={updatingId === record.id || record.status === "REPLIED"} onSelect={() => void updateStatus(record.id, "REPLIED")}>
            <Reply className="h-3 w-3" />
            Mark as replied
          </DropdownMenuItem>
          <DropdownMenuItem disabled={updatingId === record.id || record.status === "FOLLOW_UP_DUE"} onSelect={() => void updateStatus(record.id, "FOLLOW_UP_DUE")}>
            <Clock3 className="h-3 w-3" />
            Mark follow-up due
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/contacts/${record.contact.id}`}>View contact</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/companies/${record.company.id}`}>View company</Link>
          </DropdownMenuItem>
          {record.application && (
            <DropdownMenuItem asChild>
              <Link href={`/applications/${record.application.id}`}>View application</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setEditing(record); setFormOpen(true); }}>
            <Pencil className="h-3 w-3" />
            Edit outreach
          </DropdownMenuItem>
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(record)}>
            <Trash2 className="h-3 w-3" />
            Delete record
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search messages, people, companies…"
        count={records.length}
        countLabel={records.length === 1 ? "record" : "records"}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: OUTREACH_STATUS_OPTIONS },
          { key: "channel", label: "Channel", allLabel: "All channels", options: OUTREACH_CHANNEL_OPTIONS },
          {
            key: "company",
            label: "Company",
            allLabel: "All companies",
            options: companies.map((company) => ({ value: company.id, label: company.name })),
          },
        ]}
      >
        <Button
          size="sm"
          variant="brand"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Log outreach
        </Button>
      </ListToolbar>

      {items.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Send className="h-4.5 w-4.5" />
          </span>
          <p className="mt-1 text-[13px] font-medium text-foreground">No outreach found</p>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Log a cold email or LinkedIn message, or adjust the filters to see more conversations.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-5 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Conversation</th>
                    <th className="px-3 py-3"><SortHeader sort="contact" /></th>
                    <th className="px-3 py-3"><SortHeader sort="company" /></th>
                    <th className="px-3 py-3"><SortHeader sort="channel" /></th>
                    <th className="px-3 py-3"><SortHeader sort="status" /></th>
                    <th className="px-3 py-3"><SortHeader sort="sentAt" /></th>
                    <th className="px-3 py-3"><SortHeader sort="nextFollowUp" /></th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((record) => (
                    <tr key={record.id} className="group transition-colors hover:bg-surface-muted/50">
                      <td className="max-w-[280px] px-5 py-3">
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {record.subject || OUTREACH_CHANNEL_LABELS[record.channel]}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{record.message}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/contacts/${record.contact.id}`} className="flex items-center gap-2 text-[11.5px] text-muted-strong hover:text-brand">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[9px] font-semibold text-brand">
                            {initials(record.contact.fullName)}
                          </span>
                          <span className="truncate">{record.contact.fullName}</span>
                        </Link>
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-3 text-[11.5px] text-muted-strong">{record.company.name}</td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{OUTREACH_CHANNEL_LABELS[record.channel]}</td>
                      <td className="px-3 py-3">
                        <Badge variant={OUTREACH_STATUS_VARIANTS[record.status]}>{OUTREACH_STATUS_LABELS[record.status]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{formatShortDate(record.sentAt)}</td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{formatShortDate(record.nextFollowUp)}</td>
                      <td className="px-3 py-3"><RowActions record={record} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 space-y-2 md:hidden">
            {sorted.map((record) => (
              <Card key={record.id} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                    {initials(record.contact.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {record.subject || OUTREACH_CHANNEL_LABELS[record.channel]}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {record.contact.fullName} · {record.company.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-strong">{record.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={OUTREACH_STATUS_VARIANTS[record.status]}>{OUTREACH_STATUS_LABELS[record.status]}</Badge>
                      <Badge variant="outline">{OUTREACH_CHANNEL_LABELS[record.channel]}</Badge>
                      {record.sentAt && <span className="text-[9.5px] text-muted">Sent {formatShortDate(record.sentAt)}</span>}
                    </div>
                  </div>
                  <RowActions record={record} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <OutreachFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        contacts={contacts}
        companies={companies}
        applications={applications}
        templates={templates}
        record={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete outreach record?"
        description="This removes the message and its linked activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
