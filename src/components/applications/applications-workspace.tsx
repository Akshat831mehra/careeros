"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListToolbar } from "@/components/modules/list-toolbar";
import {
  ApplicationFormDialog,
  type ApplicationFormValues,
} from "@/components/applications/application-form-dialog";
import { deleteJson, patchJson } from "@/lib/client-api";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_OPTIONS,
  APPLICATION_STATUS_VARIANTS,
  WORK_MODE_LABELS,
  WORK_MODE_OPTIONS,
} from "@/lib/constants";
import { cn, formatShortDate, initials } from "@/lib/utils";

export type ApplicationRow = ApplicationFormValues & {
  id: string;
  title: string;
  companyId: string;
  status: keyof typeof APPLICATION_STATUS_LABELS;
  workMode: keyof typeof WORK_MODE_LABELS;
  createdAt: Date | string;
  updatedAt: Date | string;
  company: { id: string; name: string; priority: "HIGH" | "MEDIUM" | "LOW" };
  _count: { outreach: number; events: number; tasks: number };
};

type SortKey = "title" | "company" | "status" | "workMode" | "dateApplied" | "nextFollowUp" | "updatedAt";
type ViewMode = "table" | "kanban";

const SORT_LABELS: Record<SortKey, string> = {
  title: "Role",
  company: "Company",
  status: "Status",
  workMode: "Work mode",
  dateApplied: "Applied",
  nextFollowUp: "Follow-up",
  updatedAt: "Updated",
};

const KANBAN_COLUMNS = [
  { id: "planning", label: "Planning", statuses: ["INTERESTED", "PREPARING"] },
  { id: "applied", label: "Applied", statuses: ["APPLIED"] },
  { id: "screening", label: "Screening", statuses: ["HR_CONTACTED", "RECRUITER_SCREENING"] },
  {
    id: "interviews",
    label: "Interviews",
    statuses: ["TECHNICAL_INTERVIEW", "MANAGERIAL_INTERVIEW", "FINAL_INTERVIEW"],
  },
  { id: "offer", label: "Offer", statuses: ["OFFER_RECEIVED"] },
  { id: "closed", label: "Closed", statuses: ["REJECTED", "WITHDRAWN"] },
] as const;

type KanbanColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

const COLUMN_DOT: Record<KanbanColumnId, string> = {
  planning: "bg-border-strong",
  applied: "bg-info",
  screening: "bg-brand",
  interviews: "bg-warning",
  offer: "bg-success",
  closed: "bg-danger",
};

function columnFor(status: keyof typeof APPLICATION_STATUS_LABELS): KanbanColumnId {
  return (
    KANBAN_COLUMNS.find((column) => (column.statuses as readonly string[]).includes(status))?.id ?? "planning"
  );
}

function compareDates(a: Date | string | null | undefined, b: Date | string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left - right;
}

export function ApplicationsWorkspace({
  applications,
  companies,
  resumes,
}: {
  applications: ApplicationRow[];
  companies: { id: string; name: string }[];
  resumes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(applications);
  const [view, setView] = React.useState<ViewMode>("table");
  const [sortKey, setSortKey] = React.useState<SortKey>("updatedAt");
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApplicationRow | null>(null);
  const [deleting, setDeleting] = React.useState<ApplicationRow | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<KanbanColumnId | null>(null);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(applications), [applications]);

  const sorted = React.useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "company":
          comparison = a.company.name.localeCompare(b.company.name);
          break;
        case "status":
          comparison = APPLICATION_STATUS_LABELS[a.status].localeCompare(APPLICATION_STATUS_LABELS[b.status]);
          break;
        case "workMode":
          comparison = WORK_MODE_LABELS[a.workMode].localeCompare(WORK_MODE_LABELS[b.workMode]);
          break;
        case "dateApplied":
          comparison = compareDates(a.dateApplied, b.dateApplied);
          break;
        case "nextFollowUp":
          comparison = compareDates(a.nextFollowUp, b.nextFollowUp);
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
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
      setDirection(key === "updatedAt" || key === "dateApplied" || key === "nextFollowUp" ? "desc" : "asc");
    }
  }

  const changeStatus = React.useCallback(
    async (applicationId: string, status: keyof typeof APPLICATION_STATUS_LABELS) => {
      const current = items.find((item) => item.id === applicationId);
      if (!current || current.status === status) return;
      const previous = items;
      setMovingId(applicationId);
      setItems((rows) => rows.map((row) => (row.id === applicationId ? { ...row, status } : row)));
      try {
        await patchJson(`/api/applications/${applicationId}`, { status });
        toast.success(`${current.title} moved to ${APPLICATION_STATUS_LABELS[status]}`);
        router.refresh();
      } catch (error) {
        setItems(previous);
        toast.error(error instanceof Error ? error.message : "Could not update status");
      } finally {
        setMovingId(null);
      }
    },
    [items, router],
  );

  function handleDrop(event: React.DragEvent<HTMLDivElement>, columnId: KanbanColumnId) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    setDropTarget(null);
    setDraggingId(null);
    if (!id) return;
    const status = KANBAN_COLUMNS.find((column) => column.id === columnId)?.statuses[0];
    if (status) void changeStatus(id, status);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/applications/${deleting.id}`);
      toast.success(`${deleting.title} removed from your pipeline`);
      setItems((rows) => rows.filter((row) => row.id !== deleting.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete application");
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

  function RowActions({ application }: { application: ApplicationRow }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${application.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[340px] overflow-y-auto">
          <DropdownMenuItem asChild>
            <Link href={`/applications/${application.id}`}>View details</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/companies/${application.companyId}`}>Open company</Link>
          </DropdownMenuItem>
          {application.postingUrl && (
            <DropdownMenuItem asChild>
              <a href={application.postingUrl} target="_blank" rel="noreferrer">
                Job posting
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {APPLICATION_STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={option.value === application.status || movingId === application.id}
              onSelect={() => void changeStatus(application.id, option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setEditing(application); setFormOpen(true); }}>
            <Pencil className="h-3 w-3" />
            Edit application
          </DropdownMenuItem>
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(application)}>
            <Trash2 className="h-3 w-3" />
            Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search roles, companies, locations…"
        count={applications.length}
        countLabel={applications.length === 1 ? "application" : "applications"}
        filters={[
          {
            key: "company",
            label: "Company",
            allLabel: "All companies",
            options: companies.map((company) => ({ value: company.id, label: company.name })),
          },
          { key: "status", label: "Status", allLabel: "All statuses", options: APPLICATION_STATUS_OPTIONS },
          { key: "workMode", label: "Work mode", allLabel: "All work modes", options: WORK_MODE_OPTIONS },
        ]}
      >
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={cn(view === "table" && "bg-surface-hover text-foreground")}
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <Table2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className={cn(view === "kanban" && "bg-surface-hover text-foreground")}
            onClick={() => setView("kanban")}
            aria-label="Kanban view"
          >
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="brand"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add application
        </Button>
      </ListToolbar>

      {items.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Table2 className="h-4.5 w-4.5" />
          </span>
          <p className="mt-1 text-[13px] font-medium text-foreground">No applications found</p>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Add an opportunity or adjust the filters to see more of your pipeline.
          </p>
        </Card>
      ) : view === "table" ? (
        <>
          <Card className="mt-4 hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-5 py-3"><SortHeader sort="title" /></th>
                    <th className="px-3 py-3"><SortHeader sort="company" /></th>
                    <th className="px-3 py-3"><SortHeader sort="status" /></th>
                    <th className="px-3 py-3"><SortHeader sort="workMode" /></th>
                    <th className="px-3 py-3"><SortHeader sort="dateApplied" /></th>
                    <th className="px-3 py-3"><SortHeader sort="nextFollowUp" /></th>
                    <th className="px-3 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Activity</th>
                    <th className="px-3 py-3"><SortHeader sort="updatedAt" /></th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((application) => (
                    <tr key={application.id} className="group transition-colors hover:bg-surface-muted/50">
                      <td className="px-5 py-3">
                        <Link href={`/applications/${application.id}`} className="block min-w-0">
                          <span className="block truncate text-[12px] font-medium text-foreground group-hover:text-brand">
                            {application.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted">
                            {application.location || "Location not set"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] text-muted-strong">{application.company.name}</td>
                      <td className="px-3 py-3">
                        <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]}>
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{WORK_MODE_LABELS[application.workMode]}</td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{formatShortDate(application.dateApplied)}</td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{formatShortDate(application.nextFollowUp)}</td>
                      <td className="px-3 py-3 text-[10px] tabular-nums text-muted">
                        {application._count.outreach} msgs · {application._count.events} events
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted">{formatShortDate(application.updatedAt)}</td>
                      <td className="px-3 py-3"><RowActions application={application} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 space-y-2 lg:hidden">
            {sorted.map((application) => (
              <Card key={application.id} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-soft text-[10px] font-semibold text-info">
                    {initials(application.company.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/applications/${application.id}`} className="text-[12.5px] font-medium text-foreground">
                      {application.title}
                    </Link>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {application.company.name} · {application.location || "Location not set"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Badge>
                      <Badge variant="outline">{WORK_MODE_LABELS[application.workMode]}</Badge>
                    </div>
                    <p className="mt-2 text-[10px] text-muted">
                      Applied {formatShortDate(application.dateApplied)} · Follow-up {formatShortDate(application.nextFollowUp)}
                    </p>
                  </div>
                  <RowActions application={application} />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {KANBAN_COLUMNS.map((column) => {
            const columnItems = sorted.filter((item) => columnFor(item.status) === column.id);
            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(column.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(event) => handleDrop(event, column.id)}
                className={cn(
                  "flex min-h-[300px] flex-col rounded-xl border border-border bg-surface-muted/30 p-2 transition-colors",
                  dropTarget === column.id && "border-brand bg-brand-soft/40",
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", COLUMN_DOT[column.id])} />
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-strong">{column.label}</span>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted">{columnItems.length}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {columnItems.map((application) => (
                    <Card
                      key={application.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", application.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(application.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      className={cn(
                        "cursor-grab p-3 transition-all active:cursor-grabbing",
                        draggingId === application.id && "opacity-50",
                        movingId === application.id && "opacity-70",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <Link href={`/applications/${application.id}`} className="block truncate text-[11.5px] font-medium text-foreground hover:text-brand">
                            {application.title}
                          </Link>
                          <p className="mt-0.5 truncate text-[10px] text-muted">{application.company.name}</p>
                        </div>
                        <RowActions application={application} />
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]}>
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </Badge>
                        <Badge variant="default">{WORK_MODE_LABELS[application.workMode]}</Badge>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-muted">
                        <span>Applied {formatShortDate(application.dateApplied)}</span>
                        <span className="inline-flex items-center gap-1">
                          <GripVertical className="h-3 w-3" />
                          {application._count.outreach} msgs
                        </span>
                      </div>
                    </Card>
                  ))}
                  {columnItems.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted">
                      Drop applications here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ApplicationFormDialog
        key={`${formOpen ? "open" : "closed"}-${editing?.id ?? "new"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        resumes={resumes}
        application={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "application"}?`}
        description="This removes the application and links to its outreach, events, tasks and activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
