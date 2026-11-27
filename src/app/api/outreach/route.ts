import { NextResponse } from "next/server";
import { ActivityType, OutreachStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError, outreachCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = outreachCreateSchema.parse(await request.json());

    const [contact, company] = await Promise.all([
      prisma.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true, fullName: true } }),
      prisma.company.findFirst({ where: { id: data.companyId, userId }, select: { id: true, name: true } }),
    ]);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    let applicationId: string | null = null;
    if (data.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: data.applicationId, userId },
        select: { id: true },
      });
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
      applicationId = application.id;
    }

    const sentAt = data.sentAt ? new Date(data.sentAt) : data.status === OutreachStatus.SENT ? new Date() : null;

    const outreach = await prisma.outreach.create({
      data: {
        userId,
        contactId: contact.id,
        companyId: company.id,
        applicationId,
        channel: data.channel,
        subject: data.subject,
        message: data.message,
        sentAt,
        status: data.status,
        responseStatus: data.responseStatus,
        nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
        notes: data.notes,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: sentAt ? ActivityType.OUTREACH_SENT : ActivityType.STATUS_UPDATED,
        title: `${data.channel.replaceAll("_", " ").toLowerCase()} to ${contact.fullName}`,
        description: data.subject ?? undefined,
        contactId: contact.id,
        companyId: company.id,
        applicationId,
        outreachId: outreach.id,
        metadata: { status: data.status },
      },
    });

    return NextResponse.json({ outreach }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not log outreach. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}
