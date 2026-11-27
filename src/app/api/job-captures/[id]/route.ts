import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  firstZodMessage,
  isZodError,
  jobCaptureUpdateSchema,
} from "@/lib/validations";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.jobCapture.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Capture not found" }, { status: 404 });

  try {
    const data = jobCaptureUpdateSchema.parse(await request.json());
    const capture = await prisma.jobCapture.update({
      where: { id },
      data: { status: data.status },
    });
    return NextResponse.json({ capture });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update capture.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.jobCapture.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Capture not found" }, { status: 404 });

  await prisma.jobCapture.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
