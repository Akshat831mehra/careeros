import type { Metadata } from "next";
import { EventType, Prisma } from "@prisma/client";
import { endOfDay, isBefore, startOfDay } from "date-fns";
import { CalendarCheck2, CalendarClock, CalendarDays, CalendarX2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CalendarWorkspace, type CalendarEventRow } from "@/components/calendar/calendar-workspace";
import { EVENT_TYPES } from "@/lib/constants";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Calendar" };

type SearchParams = Promise<{ q?: string; type?: string; company?: string }>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();
  const now = new Date();

  const where: Prisma.CalendarEventWhereInput = {
    userId: user.id,
    ...(params.company ? { companyId: params.company } : {}),
    ...(EVENT_TYPES.includes(params.type as EventType) ? { type: params.type as EventType } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { company: { name: { contains: query, mode: "insensitive" } } },
            { contact: { fullName: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [events, allEvents, companies, contacts, applications] = await Promise.all([
    prisma.calendarEvent.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
        application: { select: { id: true, title: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      select: { startAt: true, completed: true },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true, designation: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const today = allEvents.filter(
    (event) => !event.completed && event.startAt >= startOfDay(now) && event.startAt <= endOfDay(now),
  ).length;
  const upcoming = allEvents.filter((event) => !event.completed && event.startAt > endOfDay(now)).length;
  const overdue = allEvents.filter((event) => !event.completed && isBefore(event.startAt, startOfDay(now))).length;
  const completed = allEvents.filter((event) => event.completed).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Interviews, follow-ups, deadlines and networking reminders — with a month view and a focused daily agenda."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today" value={today} sub="Events scheduled" icon={CalendarDays} tone="brand" />
        <StatCard label="Upcoming" value={upcoming} sub="After today" icon={CalendarClock} tone="blue" />
        <StatCard label="Overdue" value={overdue} sub="Needs attention" icon={CalendarX2} tone="red" />
        <StatCard label="Completed" value={completed} sub="All time" icon={CalendarCheck2} tone="green" />
      </section>

      <CalendarWorkspace
        events={events as CalendarEventRow[]}
        companies={companies}
        contacts={contacts}
        applications={applications}
      />
    </div>
  );
}
