import { NextResponse } from "next/server";
import { ActivityType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import {
  firstZodMessage,
  isZodError,
  taskCreateSchema,
} from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = taskCreateSchema.parse(await request.json());

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

    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Choose a valid due date" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate,
        companyId: data.companyId || null,
        contactId: data.contactId || null,
        applicationId: data.applicationId || null,
        status: data.status,
        completedAt: data.status === TaskStatus.COMPLETED ? new Date() : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: ActivityType.TASK_ADDED,
        title: `Task added: ${task.title}`,
        description: task.description,
        companyId: data.companyId || undefined,
        contactId: data.contactId || undefined,
        applicationId: data.applicationId || undefined,
        metadata: { taskId: task.id },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not create task. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}
