import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  firstZodMessage,
  isZodError,
  savedSearchUpdateSchema,
} from "@/lib/validations";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Saved search not found" }, { status: 404 });

  try {
    const data = savedSearchUpdateSchema.parse(await request.json());
    const savedSearch = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.query !== undefined ? { query: data.query } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.experienceMin !== undefined ? { experienceMin: data.experienceMin } : {}),
        ...(data.experienceMax !== undefined ? { experienceMax: data.experienceMax } : {}),
        ...(data.postedWithinHours !== undefined ? { postedWithinHours: data.postedWithinHours } : {}),
        ...(data.sources !== undefined ? { sources: data.sources } : {}),
      },
    });
    return NextResponse.json({ savedSearch });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update saved search.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Saved search not found" }, { status: 404 });

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
