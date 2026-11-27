import type { Metadata } from "next";
import { endOfDay, isBefore, startOfDay, subDays } from "date-fns";
import {
  CircleDashed,
  Clock3,
  PlayCircle,
  TriangleAlert,
} from "lucide-react";
import { Priority, Prisma, TaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TasksWorkspace, type TaskRow } from "@/components/tasks/tasks-workspace";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Tasks & Follow-ups" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  priority?: string;
  company?: string;
  due?: string;
}>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const dueFilter: Prisma.TaskWhereInput =
    params.due === "today"
      ? { dueDate: { gte: todayStart, lte: todayEnd } }
      : params.due === "upcoming"
        ? { dueDate: { gt: todayEnd } }
        : params.due === "overdue"
          ? { dueDate: { lt: todayStart }, status: { not: TaskStatus.COMPLETED } }
          : params.due === "none"
            ? { dueDate: null }
            : {};

  const where: Prisma.TaskWhereInput = {
    userId: user.id,
    ...dueFilter,
    ...(params.company ? { companyId: params.company } : {}),
    ...(TASK_STATUSES.includes(params.status as TaskStatus) ? { status: params.status as TaskStatus } : {}),
    ...(PRIORITIES.includes(params.priority as Priority) ? { priority: params.priority as Priority } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { company: { name: { contains: query, mode: "insensitive" } } },
            { contact: { fullName: { contains: query, mode: "insensitive" } } },
            { application: { title: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [tasks, allTasks, companies, contacts, applications] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
        application: { select: { id: true, title: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.task.findMany({
      where: { userId: user.id },
      select: { status: true, priority: true, dueDate: true, completedAt: true },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true, companyId: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, companyId: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const pending = allTasks.filter((task) => task.status === TaskStatus.PENDING).length;
  const inProgress = allTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
  const completed = allTasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
  const overdue = allTasks.filter(
    (task) => task.dueDate && isBefore(task.dueDate, todayStart) && task.status !== TaskStatus.COMPLETED,
  ).length;
  const dueToday = allTasks.filter(
    (task) => task.dueDate && task.dueDate >= todayStart && task.dueDate <= todayEnd && task.status !== TaskStatus.COMPLETED,
  ).length;
  const doneThisWeek = allTasks.filter(
    (task) => task.completedAt && task.completedAt >= subDays(now, 7),
  ).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="To-do"
        title="Tasks & Follow-ups"
        description="The small actions that keep a search moving — prep work, follow-ups and deadlines, each linked to the right opportunity."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending} sub="Not started yet" icon={CircleDashed} tone="brand" />
        <StatCard label="In progress" value={inProgress} sub="Currently active" icon={PlayCircle} tone="blue" />
        <StatCard label="Due today" value={dueToday} sub="Need your attention" icon={Clock3} tone="amber" />
        <StatCard label="Overdue" value={overdue} sub={doneThisWeek ? `${doneThisWeek} done this week` : "Needs attention"} icon={TriangleAlert} tone="red" />
      </section>

      <TasksWorkspace
        tasks={tasks as TaskRow[]}
        companies={companies}
        contacts={contacts}
        applications={applications}
      />
    </div>
  );
}
