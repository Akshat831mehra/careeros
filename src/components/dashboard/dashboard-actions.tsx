"use client";

import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";

export function DashboardActions() {
  const { openQuickAdd } = useQuickAdd();

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" asChild className="hidden sm:inline-flex">
        <Link href="/calendar">
          <CalendarDays className="h-3.5 w-3.5 text-muted" />
          Calendar
        </Link>
      </Button>
      <Button size="sm" onClick={() => openQuickAdd("application")}>
        <Plus className="h-3.5 w-3.5" />
        Add application
      </Button>
    </div>
  );
}
