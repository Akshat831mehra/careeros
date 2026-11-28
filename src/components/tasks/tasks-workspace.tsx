"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDashed,
  Clock3,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
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
import { TaskFormDialog, type TaskFormValues } from "@/components/tasks/task-form-dialog";
import { deleteJson, patchJson } from "@/lib/client-api";
import {
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_VARIANTS,
  type BadgeVariant,
} from "@/lib/constants";
import { cn, formatShortDate, initials } from "@/lib/utils";

export type TaskRow = TaskFormValues & {
  id: string;
  title: string;
  description: string | null;
  priority: keyof typeof PRIORITY_LABELS;
  status: keyof typeof TASK_STATUS_LABELS;
  dueDate: Date | string | null;
  createdAt: Date | string;
  company: { id: string; name: string } | null;
  contact: { id: string; fullName: string } | null;
  application: { id: string; title: string } | null;
};

type SortKey = "title" | "company" | "priority" | "status" | "dueDate" | "createdAt";

const SORT_LABELS: Record<SortKey, string> = {
  title: "Task",
  company: "Company",
  priority: "Priority",
  status: "Status",
  dueDate: "Due",
  createdAt: "Added",
};

const PRIORITY_RANK: Record<keyof typeof PRIORITY_LABELS, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const STATUS_RANK: Record<keyof typeof TASK_STATUS_LABELS, number> = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 };

function compareDates(a: Date | string | null | undefined, b: Date | string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const left = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const right = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return left - right;
}

function isOverdue(task: TaskRow) {
  if (!task.dueDate || task.status === "COMPLETED") return false;
  const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function dueBadgeVariant(task: TaskRow): BadgeVariant {
  if (task.status === "COMPLETED") return "success";
  if (isOverdue(task)) return "danger";
  if (!task.dueDate) return "outline";
  const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return days <= 1 ? "warning" : "default";
}

function dueLabel(task: TaskRow) {
  if (!task.dueDate) return "No due date";
  if (task.status === "COMPLETED") return `Due ${formatShortDate(task.dueDate)}`;
  if (isOverdue(task)) return `Overdue · ${formatShortDate(task.dueDate)}`;
  const date = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${formatShortDate(task.dueDate)}`;
}

export function TasksWorkspace({
  tasks,
  companies,
  contacts,
  applications,
}: {
  tasks: TaskRow[];
  companies: { id: string; name: string }[];
  contacts: { id: string; fullName: string; companyId: string | null }[];
  applications: { id: string; title: string; companyId: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(tasks);
  const [sortKey, setSortKey] = React.useState<SortKey>("dueDate");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskRow | null>(null);
  const [deleting, setDeleting] = React.useState<TaskRow | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(tasks), [tasks]);

  const sorted = React.useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "company":
          comparison = (a.company?.name ?? "").localeCompare(b.company?.name ?? "");
          break;
        case "priority":
          comparison = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          break;
        case "status":
          comparison = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          break;
        case "dueDate":
          comparison = compareDates(a.dueDate, b.dueDate);
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
      setDirection(key === "createdAt" || key === "dueDate" ? "desc" : "asc");
    }
  }

  async function updateTask(taskId: string, patch: { status?: TaskRow["status"] }) {
    const current = items.find((item) => item.id === taskId);
    if (!current) return;
    if (patch.status && patch.status === current.status) return;
    const previous = items;
    setUpdatingId(taskId);
    setItems((rows) => rows.map((row) => (row.id === taskId ? { ...row, ...patch } : row)));
    try {
      await patchJson(`/api/tasks/${taskId}`, patch);
      toast.success(
        patch.status === "COMPLETED"
          ? "Task completed"
          : patch.status
            ? `Moved to ${TASK_STATUS_LABELS[patch.status].toLowerCase()}`
            : "Task updated",
      );
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast.error(error instanceof Error ? error.message : "Could not update task");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/tasks/${deleting.id}`);
      toast.success(`${deleting.title} removed`);
      setItems((rows) => rows.filter((row) => row.id !== deleting.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete task");
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

  function CompleteButton({ task, compact = false }: { task: TaskRow; compact?: boolean }) {
    const done = task.status === "COMPLETED";
    return (
      <button
        type="button"
        onClick={() => void updateTask(task.id, { status: done ? "PENDING" : "COMPLETED" })}
        disabled={updatingId === task.id}
        aria-label={done ? "Mark task incomplete" : "Mark task complete"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border transition-colors",
          compact ? "h-4 w-4" : "h-5 w-5",
          done ? "border-success bg-success text-background" : "border-border-strong hover:border-brand hover:text-brand",
        )}
      >
        {done && <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      </button>
    );
  }

  function RowActions({ task }: { task: TaskRow }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${task.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[340px] overflow-y-auto">
          <DropdownMenuItem
            disabled={updatingId === task.id || task.status === "PENDING"}
            onSelect={() => void updateTask(task.id, { status: "PENDING" })}
          >
            <CircleDashed className="h-3 w-3" />
            Mark pending
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updatingId === task.id || task.status === "IN_PROGRESS"}
            onSelect={() => void updateTask(task.id, { status: "IN_PROGRESS" })}
          >
            <Play className="h-3 w-3" />
            Mark in progress
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updatingId === task.id || task.status === "COMPLETED"}
            onSelect={() => void updateTask(task.id, { status: "COMPLETED" })}
          >
            <Check className="h-3 w-3" />
            Mark completed
          </DropdownMenuItem>
          {(task.application || task.company || task.contact) && <DropdownMenuSeparator />}
          {task.application && (
            <DropdownMenuItem asChild>
              <Link href={`/applications/${task.application.id}`}>
                Open {task.application.title}
              </Link>
            </DropdownMenuItem>
          )}
          {task.company && (
            <DropdownMenuItem asChild>
              <Link href={`/companies/${task.company.id}`}>Open {task.company.name}</Link>
            </DropdownMenuItem>
          )}
          {task.contact && (
            <DropdownMenuItem asChild>
              <Link href={`/contacts/${task.contact.id}`}>Open {task.contact.fullName}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setEditing(task); setFormOpen(true); }}>
            <Pencil className="h-3 w-3" />
            Edit task
          </DropdownMenuItem>
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(task)}>
            <Trash2 className="h-3 w-3" />
            Delete task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search tasks, companies, descriptions…"
        count={items.length}
        countLabel={items.length === 1 ? "task" : "tasks"}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: TASK_STATUS_OPTIONS },
          { key: "priority", label: "Priority", allLabel: "All priorities", options: PRIORITY_OPTIONS },
          {
            key: "company",
            label: "Company",
            allLabel: "All companies",
            options: companies.map((company) => ({ value: company.id, label: company.name })),
          },
          {
            key: "due",
            label: "Due",
            allLabel: "Any time",
            options: [
              { value: "today", label: "Today" },
              { value: "upcoming", label: "Upcoming" },
              { value: "overdue", label: "Overdue" },
              { value: "none", label: "No due date" },
            ],
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
          Add task
        </Button>
      </ListToolbar>

      {items.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ListChecks className="h-4.5 w-4.5" />
          </span>
          <p className="mt-1 text-[13px] font-medium text-foreground">No tasks found</p>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Add a task or adjust the filters to see more of your to-do list.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-4 hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-2 py-3"><SortHeader sort="title" /></th>
                    <th className="px-3 py-3"><SortHeader sort="company" /></th>
                    <th className="px-3 py-3"><SortHeader sort="priority" /></th>
                    <th className="px-3 py-3"><SortHeader sort="status" /></th>
                    <th className="px-3 py-3"><SortHeader sort="dueDate" /></th>
                    <th className="px-3 py-3"><SortHeader sort="createdAt" /></th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((task) => (
                    <tr key={task.id} className="group transition-colors hover:bg-surface-muted/50">
                      <td className="px-4 py-3"><CompleteButton task={task} compact /></td>
                      <td className="max-w-[280px] px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("truncate text-[12px] font-medium", task.status === "COMPLETED" ? "text-muted line-through" : "text-foreground")}>
                            {task.title}
                          </span>
                          {task.application && (
                            <Link href={`/applications/${task.application.id}`} className="shrink-0 text-[9.5px] text-brand hover:underline">
                              {task.application.title}
                            </Link>
                          )}
                        </div>
                        {task.description && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{task.description}</p>}
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-3 text-[11.5px] text-muted-strong">
                        {task.company ? (
                          <Link href={`/companies/${task.company.id}`} className="hover:text-brand">{task.company.name}</Link>
                        ) : task.contact ? (
                          <Link href={`/contacts/${task.contact.id}`} className="hover:text-brand">{task.contact.fullName}</Link>
                        ) : (
                          <span className="text-muted">Personal</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={PRIORITY_VARIANTS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={TASK_STATUS_VARIANTS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={dueBadgeVariant(task)}>{dueLabel(task)}</Badge>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted">{formatShortDate(task.createdAt)}</td>
                      <td className="px-3 py-3"><RowActions task={task} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 space-y-2 lg:hidden">
            {sorted.map((task) => (
              <Card key={task.id} className={cn("p-3", isOverdue(task) && "border-danger/30")}>
                <div className="flex items-start gap-3">
                  <div className="pt-0.5"><CompleteButton task={task} compact /></div>
                  {task.company && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-[9px] font-semibold text-muted-strong">
                      {initials(task.company.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[12.5px] font-medium", task.status === "COMPLETED" ? "text-muted line-through" : "text-foreground")}>
                      {task.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {task.company?.name ?? task.contact?.fullName ?? "Personal task"}
                    </p>
                    {task.description && <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-strong">{task.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={TASK_STATUS_VARIANTS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                      <Badge variant={PRIORITY_VARIANTS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                      <Badge variant={dueBadgeVariant(task)}>
                        <Clock3 className="mr-1 h-2.5 w-2.5" />
                        {dueLabel(task)}
                      </Badge>
                    </div>
                  </div>
                  <RowActions task={task} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <TaskFormDialog
        key={`${formOpen ? "open" : "closed"}-${editing?.id ?? "new"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        contacts={contacts}
        applications={applications}
        task={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "task"}?`}
        description="This removes the task and its activity log. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
