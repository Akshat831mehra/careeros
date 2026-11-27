import { NextResponse } from "next/server";
import { ActivityType, OutreachStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError, outreachUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = outreachUpdateSchema.parse(await request.json());

    const existing = await prisma.outreach.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        contactId: true,
        companyId: true,
        contact: { select: { fullName: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });

    if (data.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (data.companyId) {
      const company = await prisma.company.findFirst({ where: { id: data.companyId, userId }, select: { id: true } });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (data.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: data.applicationId, userId },
        select: { id: true },
      });
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const becomesSent = data.status === OutreachStatus.SENT && existing.status !== OutreachStatus.SENT;

    const outreach = await prisma.$transaction(async (tx) => {
      const updated = await tx.outreach.update({
        where: { id: existing.id },
        data: {
          ...data,
          sentAt: data.sentAt ? new Date(data.sentAt) : becomesSent ? new Date() : data.sentAt,
          nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : data.nextFollowUp,
          updatedAt: new Date(),
        },
      });

      if (data.status && data.status !== existing.status) {
        await tx.activityLog.create({
          data: {
            userId,
            type: becomesSent ? ActivityType.OUTREACH_SENT : ActivityType.STATUS_UPDATED,
            title: `Outreach to ${existing.contact.fullName} moved to ${data.status.replaceAll("_", " ").toLowerCase()}`,
            description: data.subject ?? undefined,
            contactId: updated.contactId,
            companyId: updated.companyId,
            applicationId: updated.applicationId,
            outreachId: updated.id,
            metadata: { from: existing.status, to: data.status },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ outreach });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update outreach. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const outreach = await prisma.outreach.findFirst({ where: { id, userId }, select: { id: true } });
    if (!outreach) return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });
    await prisma.outreach.delete({ where: { id: outreach.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete outreach failed", error);
    return NextResponse.json({ error: "Could not delete outreach. Please try again." }, { status: 500 });
  }
}
