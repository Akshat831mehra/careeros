import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNavCounts, getTopbarNotifications } from "@/lib/dashboard";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { QuickAddProvider } from "@/components/quick-add/quick-add-provider";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const [counts, notifications, companies, contacts] = await Promise.all([
    getNavCounts(user.id),
    getTopbarNotifications(user.id),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true, companyId: true, designation: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const sidebarUser = { name: user.name, email: user.email, image: user.image };

  return (
    <QuickAddProvider companies={companies} contacts={contacts}>
      <div className="min-h-dvh bg-background">
        <Sidebar user={sidebarUser} counts={counts} />
        <div className="lg:pl-[244px]">
          <Topbar user={sidebarUser} counts={counts} notifications={notifications} />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </QuickAddProvider>
  );
}
