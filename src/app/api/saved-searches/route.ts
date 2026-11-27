import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  firstZodMessage,
  isZodError,
  savedSearchCreateSchema,
} from "@/lib/validations";

export async function GET() {
  const user = await requireUser();
  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ savedSearches });
}

export async function POST(request: Request) {
  const user = await requireUser();

  try {
    const data = savedSearchCreateSchema.parse(await request.json());
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: data.name,
        query: data.query,
        location: data.location ?? null,
        experienceMin: data.experienceMin ?? null,
        experienceMax: data.experienceMax ?? null,
        postedWithinHours: data.postedWithinHours ?? null,
        sources: data.sources,
      },
    });
    return NextResponse.json({ savedSearch }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not create saved search.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}
