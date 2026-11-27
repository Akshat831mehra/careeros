"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  Send,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { cn } from "@/lib/utils";

const jumpItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Applications", href: "/applications", icon: BriefcaseBusiness },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Outreach", href: "/outreach", icon: Send },
  { label: "Calendar", href: "/calendar", icon: CalendarClock },
  { label: "Tasks & Follow-ups", href: "/tasks", icon: ListChecks },
  { label: "My Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

const quickActions = [
  { label: "Add company", description: "Start tracking a target company", tab: "company" as const, icon: Building2 },
  { label: "Add application", description: "Log a new job opportunity", tab: "application" as const, icon: BriefcaseBusiness },
  { label: "Add contact", description: "Save a recruiter or hiring manager", tab: "contact" as const, icon: UserRound },
  { label: "Schedule follow-up", description: "Put a reminder on your calendar", tab: "follow-up" as const, icon: CalendarClock },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { openQuickAdd } = useQuickAdd();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setQuery("");
          setOpen(true);
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const filteredJumpItems = jumpItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredQuickActions = quickActions.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="group flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-[11.5px] text-muted shadow-sm transition-colors hover:border-border-strong hover:bg-surface-hover sm:w-[220px]"
      >
        <Search className="h-3.5 w-3.5 text-muted/80" />
        <span className="hidden flex-1 text-left sm:inline">Search or jump to…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-muted px-1 py-0.5 font-sans text-[9px] text-muted sm:flex">
          <span className="text-[11px] leading-none">⌘</span>K
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent hideClose className="max-w-[540px] overflow-hidden p-0">
          <DialogTitle className="sr-only">Search and quick actions</DialogTitle>
          <Command shouldFilter={false} className="rounded-2xl bg-surface-elevated">
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search pages and actions…"
                className="h-12 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted/70"
              />
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] text-muted">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[360px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-[12px] text-muted">
                No matches. Try a different search.
              </Command.Empty>

              {filteredJumpItems.length > 0 && (
                <Command.Group
                  heading="Jump to"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[9.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted/75"
                >
                  {filteredJumpItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-muted-strong outline-none",
                        "data-[selected=true]:bg-surface-hover data-[selected=true]:text-foreground",
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 text-muted" />
                      {item.label}
                      <ArrowRight className="ml-auto h-3 w-3 text-muted/50" />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {filteredQuickActions.length > 0 && (
                <Command.Group
                  heading="Quick actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[9.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted/75"
                >
                  {filteredQuickActions.map((item) => (
                    <Command.Item
                      key={item.label}
                      value={item.label}
                      onSelect={() => {
                        setOpen(false);
                        openQuickAdd(item.tab);
                      }}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] text-muted-strong outline-none data-[selected=true]:bg-surface-hover data-[selected=true]:text-foreground"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted">
                        <item.icon className="h-3 w-3" />
                      </span>
                      <span>
                        <span className="block leading-tight">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-muted">{item.description}</span>
                      </span>
                      <Plus className="ml-auto h-3 w-3 text-muted/50" />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-3 py-2 text-[9.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-border bg-surface px-1 py-0.5">↑↓</span>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-border bg-surface px-1 py-0.5">↵</span>
                Open
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded border border-border bg-surface px-1 py-0.5">esc</span>
                Close
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
