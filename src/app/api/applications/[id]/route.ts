import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { applicationUpdateSchema, firstZodMessage, isZodError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = applicationUpdateSchema.parse(await request.json());

    const existing = await prisma.application.findFirst({
      where: { id, userId },
      select: { id: true, title: true, companyId: true, company: { select: { name: true } }, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, userId },
        select: { id: true, name: true },
      });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: existing.id },
        data: {
          ...data,
          dateApplied: data.dateApplied ? new Date(data.dateApplied) : data.dateApplied,
          nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : data.nextFollowUp,
          updatedAt: new Date(),
        },
      });

      if (data.status && data.status !== existing.status) {
        await tx.activityLog.create({
          data: {
            userId,
            type: ActivityType.STATUS_UPDATED,
            title: `${updated.title} moved to ${data.status.replaceAll("_", " ").toLowerCase()}`,
            description: `Application status updated at ${existing.company.name}`,
            applicationId: updated.id,
            companyId: updated.companyId,
            metadata: { from: existing.status, to: data.status },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update application. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const application = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    await prisma.application.delete({ where: { id: application.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete application failed", error);
    return NextResponse.json({ error: "Could not delete application. Please try again." }, { status: 500 });
  }
}
