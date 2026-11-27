"use client";

import { BriefcaseBusiness, Building2, CalendarClock, ChevronDown, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";

const actions = [
  { label: "Company", description: "Track a target company", tab: "company" as const, icon: Building2 },
  { label: "Application", description: "Log a job opportunity", tab: "application" as const, icon: BriefcaseBusiness },
  { label: "Contact", description: "Add a recruiter or manager", tab: "contact" as const, icon: UserRound },
  { label: "Follow-up", description: "Schedule a reminder", tab: "follow-up" as const, icon: CalendarClock },
];

export function QuickAddMenu() {
  const { openQuickAdd } = useQuickAdd();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 pr-2">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[232px]">
        <DropdownMenuLabel className="px-2 pb-1 pt-1">Create new</DropdownMenuLabel>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.tab}
            onSelect={() => openQuickAdd(action.tab)}
            className="gap-2.5 py-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted">
              <action.icon className="h-3 w-3" />
            </span>
            <span>
              <span className="block text-[12px] leading-tight">{action.label}</span>
              <span className="mt-0.5 block text-[10px] leading-tight text-muted">{action.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
