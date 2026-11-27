import { NextResponse } from "next/server";
import { ActivityType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError, taskUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = taskUpdateSchema.parse(await request.json());

    const existing = await prisma.task.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
        companyId: true,
        contactId: true,
        applicationId: true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, userId },
        select: { id: true },
      });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, userId },
        select: { id: true },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (data.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: data.applicationId, userId },
        select: { id: true },
      });
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const dueDate =
      data.dueDate === undefined
        ? undefined
        : data.dueDate === null
          ? null
          : new Date(data.dueDate as string);
    if (dueDate instanceof Date && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Choose a valid due date" }, { status: 400 });
    }

    const nextStatus = data.status ?? existing.status;
    let completedAt = existing.completedAt;
    if (data.completedAt !== undefined) {
      completedAt = data.completedAt ? new Date(data.completedAt) : null;
    } else if (nextStatus === TaskStatus.COMPLETED && existing.status !== TaskStatus.COMPLETED) {
      completedAt = new Date();
    } else if (nextStatus !== TaskStatus.COMPLETED && existing.status === TaskStatus.COMPLETED) {
      completedAt = null;
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: {
          ...data,
          dueDate,
          completedAt,
          updatedAt: new Date(),
        },
      });

      if (data.status && data.status !== existing.status) {
        await tx.activityLog.create({
          data: {
            userId,
            type: data.status === TaskStatus.COMPLETED
              ? ActivityType.FOLLOW_UP_COMPLETED
              : ActivityType.STATUS_UPDATED,
            title: data.status === TaskStatus.COMPLETED
              ? `Completed: ${updated.title}`
              : `Task ${updated.title} moved to ${data.status.replaceAll("_", " ").toLowerCase()}`,
            companyId: updated.companyId,
            contactId: updated.contactId,
            applicationId: updated.applicationId,
            metadata: { taskId: updated.id, from: existing.status, to: data.status },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update task. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const task = await prisma.task.findFirst({ where: { id, userId }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await prisma.task.delete({ where: { id: task.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete task failed", error);
    return NextResponse.json({ error: "Could not delete task. Please try again." }, { status: 500 });
  }
}
