import {
  ApplicationStatus,
  EventType,
  TaskStatus,
  type Application,
  type CalendarEvent,
  type Company,
  type Contact,
  type Outreach,
  type Task,
} from "@prisma/client";
import {
  addDays,
  endOfDay,
  isAfter,
  isBefore,
  isToday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { friendlyDate } from "@/lib/utils";

export {
  APPLICATION_STATUS_LABELS as STATUS_LABELS,
  OUTREACH_STATUS_LABELS,
} from "@/lib/constants";

export type ApplicationWithCompany = Application & {
  company: Pick<Company, "id" | "name">;
};

export type OutreachWithRelations = Outreach & {
  company: Pick<Company, "id" | "name">;
  contact: Pick<Contact, "id" | "fullName">;
};

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.INTERESTED,
  ApplicationStatus.PREPARING,
  ApplicationStatus.APPLIED,
  ApplicationStatus.HR_CONTACTED,
  ApplicationStatus.RECRUITER_SCREENING,
  ApplicationStatus.TECHNICAL_INTERVIEW,
  ApplicationStatus.MANAGERIAL_INTERVIEW,
  ApplicationStatus.FINAL_INTERVIEW,
];

export const PIPELINE_GROUPS = [
  {
    key: "to-apply",
    label: "To apply",
    statuses: [ApplicationStatus.INTERESTED, ApplicationStatus.PREPARING],
    color: "var(--muted)",
  },
  {
    key: "applied",
    label: "Applied",
    statuses: [ApplicationStatus.APPLIED],
    color: "var(--info)",
  },
  {
    key: "screening",
    label: "Screening",
    statuses: [ApplicationStatus.HR_CONTACTED, ApplicationStatus.RECRUITER_SCREENING],
    color: "var(--brand)",
  },
  {
    key: "interviews",
    label: "Interviews",
    statuses: [
      ApplicationStatus.TECHNICAL_INTERVIEW,
      ApplicationStatus.MANAGERIAL_INTERVIEW,
      ApplicationStatus.FINAL_INTERVIEW,
    ],
    color: "var(--warning)",
  },
  {
    key: "offer",
    label: "Offer",
    statuses: [ApplicationStatus.OFFER_RECEIVED],
    color: "var(--success)",
  },
  {
    key: "closed",
    label: "Closed",
    statuses: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
    color: "var(--danger)",
  },
] as const;

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    companies,
    applications,
    contactsCount,
    events,
    tasks,
    activities,
    recentOutreach,
    resumesCount,
    templatesCount,
  ] = await Promise.all([
    prisma.company.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.application.findMany({
      where: { userId },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.count({ where: { userId } }),
    prisma.calendarEvent.findMany({
      where: { userId },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
        application: { select: { id: true, title: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.task.findMany({
      where: { userId },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.outreach.findMany({
      where: { userId, sentAt: { not: null } },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),
    prisma.resume.count({ where: { userId } }),
    prisma.emailTemplate.count({ where: { userId } }),
  ]);

  const submitted = applications.filter((app) => app.dateApplied !== null);
  const activeApplications = applications.filter((app) => ACTIVE_STATUSES.includes(app.status));
  const offers = applications.filter((app) => app.status === ApplicationStatus.OFFER_RECEIVED);
  const rejections = applications.filter((app) => app.status === ApplicationStatus.REJECTED);

  const upcomingEvents = events
    .filter((event) => !event.completed && isAfter(event.startAt, now))
    .slice(0, 6);

  const todayEvents = events.filter(
    (event) => !event.completed && !isBefore(event.startAt, todayStart) && !isAfter(event.startAt, todayEnd),
  );

  const overdueEvents = events.filter(
    (event) => !event.completed && isBefore(event.startAt, todayStart),
  );

  const todayTasks = tasks.filter(
    (task) =>
      task.status !== TaskStatus.COMPLETED &&
      task.dueDate &&
      !isBefore(task.dueDate, todayStart) &&
      !isAfter(task.dueDate, todayEnd),
  );

  const overdueTasks = tasks.filter(
    (task) =>
      task.status !== TaskStatus.COMPLETED && task.dueDate && isBefore(task.dueDate, todayStart),
  );

  const pendingTasks = tasks.filter((task) => task.status !== TaskStatus.COMPLETED);

  const interviewsScheduled = events.filter(
    (event) => event.type === EventType.INTERVIEW && !event.completed && isAfter(event.startAt, now),
  );

  const followUpsDue = events.filter(
    (event) =>
      !event.completed &&
      (event.type === EventType.HR_FOLLOW_UP || event.type === EventType.RECRUITER_FOLLOW_UP) &&
      !isAfter(event.startAt, todayEnd),
  );

  const pipeline = PIPELINE_GROUPS.map((group) => {
    const groupApplications = applications.filter((app) =>
      (group.statuses as readonly ApplicationStatus[]).includes(app.status),
    );
    return {
      ...group,
      count: groupApplications.length,
      percentage: applications.length ? Math.round((groupApplications.length / applications.length) * 100) : 0,
    };
  });

  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const weekStart = startOfWeek(subWeeks(now, 6 - index), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);
    const count = submitted.filter(
      (app) => app.dateApplied && !isBefore(app.dateApplied, weekStart) && isBefore(app.dateApplied, weekEnd),
    ).length;
    return {
      label: index === 6 ? "This wk" : `W${index + 1}`,
      count,
      weekStart,
    };
  });

  const responseCount = applications.filter(
    (app) =>
      app.status !== ApplicationStatus.INTERESTED &&
      app.status !== ApplicationStatus.PREPARING &&
      app.status !== ApplicationStatus.APPLIED &&
      app.status !== ApplicationStatus.WITHDRAWN,
  ).length;

  const totalFocusItems =
    followUpsDue.length + todayTasks.length + todayEvents.filter((event) => event.type === EventType.INTERVIEW).length;

  const completedFocusItems = tasks.filter(
    (task) => task.status === TaskStatus.COMPLETED && task.completedAt && isToday(task.completedAt),
  ).length;

  return {
    now,
    companies,
    applications,
    contactsCount,
    events,
    tasks,
    activities,
    recentOutreach,
    resumesCount,
    templatesCount,
    stats: {
      companies: companies.length,
      applications: applications.length,
      submitted: submitted.length,
      active: activeApplications.length,
      interviews: interviewsScheduled.length,
      offers: offers.length,
      rejections: rejections.length,
      contacts: contactsCount,
      responseRate: submitted.length ? Math.round((responseCount / submitted.length) * 100) : 0,
    },
    today: {
      events: todayEvents,
      tasks: todayTasks,
      followUps: followUpsDue,
      interviews: todayEvents.filter((event) => event.type === EventType.INTERVIEW),
      overdue: overdueEvents,
    },
    pendingTasks,
    overdueTasks,
    upcomingEvents,
    pipeline,
    weeklyActivity,
    focusProgress: {
      completed: completedFocusItems,
      total: totalFocusItems,
      percentage: totalFocusItems ? Math.round((completedFocusItems / totalFocusItems) * 100) : 0,
    },
  };
}

export async function getNavCounts(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const [applications, contacts, companies, tasks, tasksToday, tasksCompletedToday, followUpsToday] =
    await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.contact.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.task.count({
        where: {
          userId,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lte: todayEnd },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.calendarEvent.count({
        where: {
          userId,
          completed: false,
          startAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

  return {
    applications,
    contacts,
    companies,
    tasks,
    tasksToday,
    tasksCompletedToday,
    followUpsToday,
  };
}

export type DashboardEvent = CalendarEvent & {
  company: { id: string; name: string } | null;
  contact: { id: string; fullName: string } | null;
  application: { id: string; title: string } | null;
};

export type DashboardTask = Task & {
  company: { id: string; name: string } | null;
  contact: { id: string; fullName: string } | null;
};

export async function getTopbarNotifications(userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [tasks, events] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: TaskStatus.COMPLETED }, dueDate: { lte: todayEnd } },
      include: { company: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, completed: false, startAt: { lte: todayEnd } },
      include: { company: { select: { name: true } } },
      orderBy: { startAt: "asc" },
      take: 3,
    }),
  ]);

  const items = [
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      meta: [task.company?.name, task.dueDate && friendlyDate(task.dueDate)].filter(Boolean).join(" · "),
      href: "/tasks",
      kind: "task" as const,
      overdue: Boolean(task.dueDate && isBefore(task.dueDate, todayStart)),
      sortAt: task.dueDate ?? now,
    })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      meta: [event.company?.name, friendlyDate(event.startAt)].filter(Boolean).join(" · "),
      href: "/calendar",
      kind: "event" as const,
      overdue: isBefore(event.startAt, todayStart),
      sortAt: event.startAt,
    })),
  ];

  return items
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      href: item.href,
      kind: item.kind,
      overdue: item.overdue,
    }));
}
