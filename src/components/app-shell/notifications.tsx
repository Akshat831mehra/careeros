"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type NotificationItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: "task" | "event";
  overdue?: boolean;
};

export function Notifications({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative text-muted" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-foreground">Notifications</p>
            <p className="text-[10px] text-muted">{items.length} items need attention</p>
          </div>
          <span className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] text-muted">
            Today
          </span>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-[11.5px] font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-[10px] text-muted">No overdue tasks or follow-ups.</p>
            </div>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    item.overdue
                      ? "border-danger/15 bg-danger-soft text-danger"
                      : "border-border bg-surface-muted text-muted"
                  }`}
                >
                  {item.kind === "task" ? (
                    <ListChecks className="h-3 w-3" />
                  ) : (
                    <CalendarClock className="h-3 w-3" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{item.meta}</p>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Link
            href="/tasks"
            onClick={() => setOpen(false)}
            className="flex h-8 items-center justify-center rounded-md text-[11px] font-medium text-muted-strong transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            View all tasks
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
