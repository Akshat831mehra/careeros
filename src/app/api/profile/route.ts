import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError, profileUpdateSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = profileUpdateSchema.parse(await request.json());

    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data, updatedAt: new Date() },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not update profile. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}
