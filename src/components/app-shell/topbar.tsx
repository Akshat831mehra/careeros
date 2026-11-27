"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { CommandMenu } from "./command-menu";
import { QuickAddMenu } from "./quick-add-menu";
import { Notifications, type NotificationItem } from "./notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPageTitle } from "@/lib/nav";

export function Topbar({
  user,
  counts,
  notifications,
}: {
  user: { name: string; email: string; image: string | null };
  counts: {
    applications: number;
    contacts: number;
    companies: number;
    tasks: number;
    tasksToday: number;
    tasksCompletedToday: number;
    followUpsToday: number;
  };
  notifications: NotificationItem[];
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebar user={user} counts={counts} />
        <div className="hidden items-center gap-1.5 text-[11px] text-muted md:flex">
          <span>Workspace</span>
          <ChevronRight className="h-3 w-3 text-muted/50" />
          <span className="font-medium text-foreground-soft">{title}</span>
        </div>
        <span className="truncate text-[13px] font-medium text-foreground md:hidden">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <CommandMenu />
        <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
        <QuickAddMenu />
        <ThemeToggle />
        <Notifications items={notifications} />
      </div>
    </header>
  );
}
