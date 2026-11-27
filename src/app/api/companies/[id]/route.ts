import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { companyUpdateSchema, firstZodMessage, isZodError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const data = companyUpdateSchema.parse(body);

    const existing = await prisma.company.findFirst({
      where: { id, userId },
      select: { id: true, name: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: new Date() },
      });

      if (data.status && data.status !== existing.status) {
        await tx.activityLog.create({
          data: {
            userId,
            type: ActivityType.STATUS_UPDATED,
            title: `${updated.name} moved to ${data.status.replaceAll("_", " ").toLowerCase()}`,
            description: `Company status updated`,
            companyId: updated.id,
            metadata: { from: existing.status, to: data.status },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update company. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const company = await prisma.company.findFirst({ where: { id, userId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    await prisma.company.delete({ where: { id: company.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete company failed", error);
    return NextResponse.json({ error: "Could not delete company. Please try again." }, { status: 500 });
  }
}
