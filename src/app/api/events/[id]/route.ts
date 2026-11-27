import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { eventUpdateSchema, firstZodMessage, isZodError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = eventUpdateSchema.parse(await request.json());

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
      select: { id: true, title: true, completed: true },
    });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (data.startAt && Number.isNaN(new Date(data.startAt).getTime())) {
      return NextResponse.json({ error: "Choose a valid date and time" }, { status: 400 });
    }

    if (data.companyId) {
      const company = await prisma.company.findFirst({ where: { id: data.companyId, userId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (data.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: data.applicationId, userId },
        select: { id: true },
      });
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.calendarEvent.update({
        where: { id: existing.id },
        data: {
          ...data,
          startAt: data.startAt ? new Date(data.startAt) : undefined,
          endAt: data.endAt ? new Date(data.endAt) : data.endAt,
          updatedAt: new Date(),
        },
      });

      if (data.completed === true && !existing.completed) {
        await tx.activityLog.create({
          data: {
            userId,
            type: ActivityType.FOLLOW_UP_COMPLETED,
            title: `Completed: ${updated.title}`,
            description: "Follow-up marked complete",
            companyId: updated.companyId,
            contactId: updated.contactId,
            applicationId: updated.applicationId,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update event. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const event = await prisma.calendarEvent.findFirst({ where: { id, userId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    await prisma.calendarEvent.delete({ where: { id: event.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete event failed", error);
    return NextResponse.json({ error: "Could not delete event. Please try again." }, { status: 500 });
  }
}
