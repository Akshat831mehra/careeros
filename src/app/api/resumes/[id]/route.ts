import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

const resumeUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Resume name is required").max(120).optional(),
    fileName: z.string().trim().min(1).max(200).optional(),
    fileUrl: z.string().trim().url("Enter a valid link to the resume").optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const data = resumeUpdateSchema.parse(await request.json());

    const existing = await prisma.resume.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    const resume = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.resume.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.resume.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: new Date() },
      });
    });

    return NextResponse.json({ resume });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update resume. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
      select: { id: true, isDefault: true },
    });
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.resume.delete({ where: { id: resume.id } });
      if (resume.isDefault) {
        const next = await tx.resume.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (next) await tx.resume.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete resume failed", error);
    return NextResponse.json({ error: "Could not delete resume. Please try again." }, { status: 500 });
  }
}
