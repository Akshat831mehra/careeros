import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Radar,
  Send,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  countKey?: "applications" | "contacts" | "companies" | "tasks";
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Companies", href: "/companies", icon: Building2, countKey: "companies" },
      { label: "Applications", href: "/applications", icon: BriefcaseBusiness, countKey: "applications" },
      { label: "Contacts", href: "/contacts", icon: Users, countKey: "contacts" },
      { label: "Outreach", href: "/outreach", icon: Send },
    ],
  },
  {
    label: "Discovery",
    items: [{ label: "Job Radar", href: "/jobs", icon: Radar, badge: "New" }],
  },
  {
    label: "Planning",
    items: [
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Tasks & Follow-ups", href: "/tasks", icon: ListChecks, countKey: "tasks" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "My Profile", href: "/profile", icon: UserRound },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);

export function getPageTitle(pathname: string) {
  if (pathname === "/") return "Dashboard";
  const item = allNavItems.find((navItem) => navItem.href === pathname);
  return item?.label ?? "CareerOS";
}
