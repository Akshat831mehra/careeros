import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { companyCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = companyCreateSchema.parse(body);

    const company = await prisma.company.create({
      data: { ...data, userId },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: ActivityType.COMPANY_ADDED,
        title: `Added ${company.name} to target companies`,
        description: [company.industry, company.location].filter(Boolean).join(" · ") || undefined,
        companyId: company.id,
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid company details" }, { status: 400 });
    }
    console.error("Create company failed", error);
    return NextResponse.json({ error: "Could not create company. Please try again." }, { status: 500 });
  }
}
