"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Pencil,
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
import { EventFormDialog, type EventFormValues } from "@/components/calendar/event-form-dialog";
import { deleteJson, patchJson } from "@/lib/client-api";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_VARIANTS,
} from "@/lib/constants";
import { cn, formatDateTime, formatTime } from "@/lib/utils";

export type CalendarEventRow = EventFormValues & {
  id: string;
  title: string;
  type: keyof typeof EVENT_TYPE_LABELS;
  startAt: Date | string;
  endAt: Date | string | null;
  description: string | null;
  completed: boolean;
  company: { id: string; name: string } | null;
  contact: { id: string; fullName: string } | null;
  application: { id: string; title: string } | null;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const EVENT_CHIP: Record<keyof typeof EVENT_TYPE_LABELS, string> = {
  HR_FOLLOW_UP: "bg-brand-soft text-brand",
  RECRUITER_FOLLOW_UP: "bg-brand-soft text-brand",
  INTERVIEW: "bg-warning-soft text-warning",
  TECHNICAL_ASSESSMENT: "bg-info-soft text-info",
  APPLICATION_DEADLINE: "bg-danger-soft text-danger",
  NETWORKING: "bg-success-soft text-success",
  CUSTOM: "bg-surface-muted text-muted-strong",
};

export function CalendarWorkspace({
  events,
  companies,
  contacts,
  applications,
}: {
  events: CalendarEventRow[];
  companies: { id: string; name: string }[];
  contacts: { id: string; fullName: string; designation: string | null }[];
  applications: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(events);
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState(() => new Date());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventRow | null>(null);
  const [deleting, setDeleting] = React.useState<CalendarEventRow | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(events), [events]);

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    items.forEach((event) => {
      const key = dayKey(asDate(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => asDate(a.startAt).getTime() - asDate(b.startAt).getTime()));
    return map;
  }, [items]);

  const selectedEvents = byDay.get(dayKey(selectedDay)) ?? [];
  const upcoming = React.useMemo(() => {
    const now = new Date();
    return items
      .filter((event) => !event.completed && asDate(event.startAt) >= now)
      .sort((a, b) => asDate(a.startAt).getTime() - asDate(b.startAt).getTime())
      .slice(0, 6);
  }, [items]);

  async function toggleComplete(record: CalendarEventRow) {
    setUpdatingId(record.id);
    const previous = items;
    const nextCompleted = !record.completed;
    setItems((rows) => rows.map((row) => (row.id === record.id ? { ...row, completed: nextCompleted } : row)));
    try {
      await patchJson(`/api/events/${record.id}`, { completed: nextCompleted });
      toast.success(nextCompleted ? "Event completed" : "Event reopened");
      router.refresh();
    } catch (error) {
      setItems(previous);
      toast.error(error instanceof Error ? error.message : "Could not update event");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/events/${deleting.id}`);
      toast.success("Event deleted");
      setItems((rows) => rows.filter((row) => row.id !== deleting.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete event");
      throw error;
    }
  }

  function EventCard({ record, compact = false }: { record: CalendarEventRow; compact?: boolean }) {
    return (
      <div
        className={cn(
          "group/event rounded-lg border border-border bg-surface px-2 py-1.5 transition-colors hover:border-brand/40",
          record.completed && "opacity-60",
        )}
      >
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => void toggleComplete(record)}
            disabled={updatingId === record.id}
            className={cn(
              "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
              record.completed ? "border-success bg-success text-background" : "border-border-strong hover:border-brand",
            )}
            aria-label={record.completed ? "Mark incomplete" : "Mark complete"}
          >
            {record.completed && <Check className="h-2.5 w-2.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[10.5px] font-medium text-foreground", record.completed && "line-through")}>
              {record.title}
            </p>
            {!compact && (
              <p className="mt-0.5 truncate text-[9px] text-muted">
                {record.allDay ? "All day" : formatTime(record.startAt)}
                {record.company ? ` · ${record.company.name}` : ""}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="shrink-0 text-muted opacity-0 transition-opacity hover:text-foreground group-hover/event:opacity-100"
                aria-label={`Actions for ${record.title}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void toggleComplete(record)}>
                <Check className="h-3 w-3" />
                {record.completed ? "Mark incomplete" : "Mark complete"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setEditing(record); setFormOpen(true); }}>
                <Pencil className="h-3 w-3" />
                Edit event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(record)}>
                <Trash2 className="h-3 w-3" />
                Delete event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search events, people, companies…"
        count={items.length}
        countLabel={items.length === 1 ? "event" : "events"}
        filters={[
          { key: "type", label: "Type", allLabel: "All types", options: EVENT_TYPE_OPTIONS },
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
          Add event
        </Button>
      </ListToolbar>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">{format(month, "MMMM yyyy")}</h2>
              <p className="mt-0.5 text-[10px] text-muted">Click a day to see its agenda</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="xs" variant="secondary" onClick={() => { setMonth(startOfMonth(new Date())); setSelectedDay(new Date()); }}>
                Today
              </Button>
              <Button size="icon-xs" variant="secondary" aria-label="Previous month" onClick={() => setMonth((current) => subMonths(current, 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-xs" variant="secondary" aria-label="Next month" onClick={() => setMonth((current) => addMonths(current, 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[700px] grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                <div key={label} className="border-b border-border bg-surface-muted/50 px-2 py-2 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-muted">
                  {label}
                </div>
              ))}
              {days.map((day) => {
                const key = dayKey(day);
                const dayEvents = byDay.get(key) ?? [];
                const isSelected = isSameDay(day, selectedDay);
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-[104px] border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-surface-hover/60",
                      !isSameMonth(day, month) && "bg-surface-muted/30 opacity-60",
                      isSelected && "bg-brand-soft/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums",
                        isToday(day) ? "bg-brand font-semibold text-brand-foreground" : "text-muted-strong",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((record) => (
                        <div
                          key={record.id}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[9px] font-medium",
                            record.completed
                              ? "bg-surface-muted text-muted line-through"
                              : EVENT_CHIP[record.type],
                          )}
                        >
                          {record.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="px-1.5 text-[9px] text-muted">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[13px] font-semibold text-foreground">{format(selectedDay, "EEEE, MMM d")}</h2>
              <p className="mt-0.5 text-[10px] text-muted">{selectedEvents.length} scheduled</p>
            </div>
            <div className="space-y-2 p-4">
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CalendarDays className="h-4 w-4 text-muted" />
                  <p className="text-[11px] text-muted">Nothing scheduled for this day.</p>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add event
                  </Button>
                </div>
              ) : (
                selectedEvents.map((record) => (
                  <div key={record.id} className="rounded-lg border border-border bg-surface-muted/30 p-2.5">
                    <EventCard record={record} />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
                      <Badge variant={EVENT_TYPE_VARIANTS[record.type]}>{EVENT_TYPE_LABELS[record.type]}</Badge>
                      {record.company && (
                        <Link href={`/companies/${record.company.id}`} className="text-[9.5px] text-muted hover:text-brand">
                          {record.company.name}
                        </Link>
                      )}
                      {record.contact && (
                        <Link href={`/contacts/${record.contact.id}`} className="text-[9.5px] text-muted hover:text-brand">
                          {record.contact.fullName}
                        </Link>
                      )}
                    </div>
                    {record.description && (
                      <p className="mt-2 pl-5 text-[10px] leading-relaxed text-muted">{record.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[13px] font-semibold text-foreground">Coming up</h2>
              <p className="mt-0.5 text-[10px] text-muted">Next unfinished events</p>
            </div>
            <div className="space-y-2 p-4">
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted">Your upcoming schedule is clear.</p>
              ) : (
                upcoming.map((record) => (
                  <div key={record.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted/30 px-3 py-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Clock3 className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-foreground">{record.title}</p>
                      <p className="mt-0.5 text-[9.5px] text-muted">{formatDateTime(record.startAt)}</p>
                      <p className="mt-0.5 truncate text-[9px] text-muted/80">
                        {record.company?.name ?? record.contact?.fullName ?? EVENT_TYPE_LABELS[record.type]}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <EventFormDialog
        key={`${formOpen ? "open" : "closed"}-${editing?.id ?? "new"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        contacts={contacts}
        applications={applications}
        event={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "event"}?`}
        description="This removes the event and its linked activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
