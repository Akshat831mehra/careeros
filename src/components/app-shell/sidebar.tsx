"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronsUpDown,
  CircleDot,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useSignOut } from "@/components/auth/sign-out";
import { Brand } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navGroups } from "@/lib/nav";
import { cn, firstName, initials } from "@/lib/utils";

type SidebarUser = {
  name: string;
  email: string;
  image: string | null;
};

type NavCounts = {
  applications: number;
  contacts: number;
  companies: number;
  tasks: number;
  tasksToday: number;
  tasksCompletedToday: number;
  followUpsToday: number;
};

export function SidebarContent({
  user,
  counts,
  onNavigate,
}: {
  user: SidebarUser;
  counts: NavCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { signOut, pending: signOutPending } = useSignOut();
  const focusTotal = counts.tasksToday + counts.followUpsToday;
  const focusDone = counts.tasksCompletedToday;
  const progress = focusTotal ? Math.min(100, Math.round((focusDone / focusTotal) * 100)) : 0;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[60px] items-center justify-between px-4">
        <Brand />
        <span className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted">
          MVP
        </span>
      </div>

      <div className="px-3 pb-2 pt-1">
        <div className="rounded-lg border border-border bg-surface-muted/70 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-medium text-foreground">Personal workspace</p>
              <p className="text-[10px] text-muted">Private to {firstName(user.name)}</p>
            </div>
            <ChevronsUpDown className="ml-auto h-3 w-3 text-muted/70" />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted/75">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const count = item.countKey ? counts[item.countKey] : undefined;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[12.5px] transition-colors",
                      active
                        ? "bg-surface-hover font-medium text-foreground"
                        : "text-muted-strong hover:bg-surface-hover/70 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute -left-3 h-4 w-[2px] rounded-r-full bg-brand" />
                    )}
                    <Icon
                      className={cn(
                        "h-[15px] w-[15px] shrink-0 transition-colors",
                        active ? "text-brand" : "text-muted group-hover:text-muted-strong",
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="truncate">{item.label}</span>
                    {typeof count === "number" && count > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded px-1 text-[9.5px] tabular-nums",
                          item.countKey === "tasks"
                            ? "bg-warning-soft text-warning"
                            : "text-muted/80",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CircleDot className="h-3 w-3 text-brand" />
              <p className="text-[10.5px] font-medium text-foreground">Today&apos;s focus</p>
            </div>
            <span className="text-[9.5px] tabular-nums text-muted">
              {focusDone}/{focusTotal}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
            {focusTotal === 0
              ? "Nothing due today. Keep the momentum going."
              : focusTotal - focusDone === 0
                ? "Everything is done. Nice work."
                : `${focusTotal - focusDone} ${focusTotal - focusDone === 1 ? "item needs" : "items need"} your attention.`}
          </p>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Link
            href="/tasks"
            onClick={onNavigate}
            className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            View tasks
            <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover">
              <Avatar className="h-7 w-7">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="bg-foreground text-[9.5px] text-background">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium leading-tight text-foreground">{user.name}</p>
                <p className="truncate text-[9.5px] leading-tight text-muted">{user.email}</p>
              </div>
              <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[228px]">
            <DropdownMenuLabel className="px-2 pb-1.5 pt-1">
              <p className="text-[11.5px] font-medium text-foreground">{user.name}</p>
              <p className="mt-0.5 truncate text-[10px] font-normal text-muted">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound />
                My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signOutPending}
              className="text-danger focus:bg-danger-soft focus:text-danger"
              onSelect={() => void signOut()}
            >
              <LogOut />
              {signOutPending ? "Signing out…" : "Sign out / switch account"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar({ user, counts }: { user: SidebarUser; counts: NavCounts }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] border-r border-border lg:block">
      <SidebarContent user={user} counts={counts} />
    </aside>
  );
}

export function MobileSidebarTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button variant="ghost" size="icon-sm" className={className} asChild>
      {children}
    </Button>
  );
}
