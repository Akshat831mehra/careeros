import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { firstZodMessage, isZodError } from "@/lib/validations";

const resumeCreateSchema = z.object({
  name: z.string().trim().min(2, "Resume name is required").max(120),
  fileName: z.string().trim().min(1, "File name is required").max(200),
  fileUrl: z.string().trim().url("Enter a valid link to the resume"),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  mimeType: z.string().trim().max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = resumeCreateSchema.parse(await request.json());

    const resume = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.resume.updateMany({ where: { userId }, data: { isDefault: false } });
      } else {
        const existing = await tx.resume.count({ where: { userId } });
        data.isDefault = existing === 0;
      }

      return tx.resume.create({
        data: {
          userId,
          name: data.name,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize ?? null,
          mimeType: data.mimeType ?? null,
          isDefault: data.isDefault ?? false,
        },
      });
    });

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: firstZodMessage(error, "Could not add resume. Please try again.") },
      { status: isZodError(error) ? 400 : 500 },
    );
  }
}
