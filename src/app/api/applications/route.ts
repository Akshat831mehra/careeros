import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { applicationCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = applicationCreateSchema.parse(body);

    const company = await prisma.company.findFirst({
      where: { id: data.companyId, userId },
      select: { id: true, name: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const application = await prisma.application.create({
      data: {
        ...data,
        companyId: company.id,
        userId,
        resumeId: resume?.id,
        dateApplied: data.dateApplied ? new Date(data.dateApplied) : null,
        nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: data.dateApplied ? ActivityType.APPLICATION_SUBMITTED : ActivityType.STATUS_UPDATED,
        title: data.dateApplied
          ? `Applied to ${company.name}`
          : `Added ${application.title} at ${company.name}`,
        description: `${application.title} · ${application.location ?? "Location not set"}`,
        companyId: company.id,
        applicationId: application.id,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid application details" }, { status: 400 });
    }
    console.error("Create application failed", error);
    return NextResponse.json({ error: "Could not create application. Please try again." }, { status: 500 });
  }
}
