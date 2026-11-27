import { NextResponse } from "next/server";
import { ActivityType, EventType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { eventCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = eventCreateSchema.parse(body);

    const startAt = new Date(data.startAt);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Choose a valid date and time" }, { status: 400 });
    }
    const endAt = data.endAt ? new Date(data.endAt) : null;

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

    let applicationId: string | null = null;
    if (data.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: data.applicationId, userId },
        select: { id: true },
      });
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
      applicationId = application.id;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        startAt,
        endAt,
        allDay: data.allDay,
        companyId: data.companyId || null,
        contactId: data.contactId || null,
        applicationId,
        description: data.description,
        completed: data.completed,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: data.type === EventType.INTERVIEW ? ActivityType.INTERVIEW_SCHEDULED : ActivityType.EVENT_SCHEDULED,
        title:
          data.type === EventType.INTERVIEW
            ? `Interview scheduled: ${data.title}`
            : `Scheduled: ${data.title}`,
        description: data.description,
        companyId: data.companyId || undefined,
        contactId: data.contactId || undefined,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid event details" }, { status: 400 });
    }
    console.error("Create event failed", error);
    return NextResponse.json({ error: "Could not schedule this follow-up. Please try again." }, { status: 500 });
  }
}
