import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { contactCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = contactCreateSchema.parse(body);

    let companyName: string | null = null;
    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, userId },
        select: { id: true, name: true },
      });
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
      companyName = company.name;
    }

    const contact = await prisma.contact.create({
      data: {
        ...data,
        companyId: data.companyId || null,
        userId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        type: ActivityType.CONTACT_ADDED,
        title: companyName ? `Added ${contact.fullName} at ${companyName}` : `Added ${contact.fullName}`,
        description: contact.designation ?? undefined,
        companyId: data.companyId || undefined,
        contactId: contact.id,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid contact details" }, { status: 400 });
    }
    console.error("Create contact failed", error);
    return NextResponse.json({ error: "Could not create contact. Please try again." }, { status: 500 });
  }
}
