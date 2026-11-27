import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { contactUpdateSchema, firstZodMessage, isZodError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = contactUpdateSchema.parse(await request.json());

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
      select: { id: true, fullName: true, relationship: true, companyId: true },
    });
    if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, userId },
        select: { id: true },
      });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const contact = await prisma.$transaction(async (tx) => {
      const updated = await tx.contact.update({
        where: { id: existing.id },
        data: { ...data, companyId: data.companyId === undefined ? undefined : data.companyId || null, updatedAt: new Date() },
      });

      if (data.relationship && data.relationship !== existing.relationship) {
        await tx.activityLog.create({
          data: {
            userId,
            type: ActivityType.STATUS_UPDATED,
            title: `${updated.fullName} marked as ${data.relationship.replaceAll("_", " ").toLowerCase()}`,
            description: "Relationship status updated",
            contactId: updated.id,
            companyId: updated.companyId ?? undefined,
            metadata: { from: existing.relationship, to: data.relationship },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ contact });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update contact. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const contact = await prisma.contact.findFirst({ where: { id, userId }, select: { id: true } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    await prisma.contact.delete({ where: { id: contact.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete contact failed", error);
    return NextResponse.json({ error: "Could not delete contact. Please try again." }, { status: 500 });
  }
}
