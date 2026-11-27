import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  absoluteResumeStorageDir,
  resolveResumeStoragePath,
  serializeResume,
  storedResumePath,
} from "@/lib/resume-storage";
import {
  hasPdfSignature,
  PDF_MIME_TYPE,
  resumeTitleFromFileName,
  ResumeUploadError,
  RESUME_MAX_FILE_SIZE,
  sanitizeResumeFileName,
  validatePdfUpload,
} from "@/lib/resume-utils";
import { getSessionUserId } from "@/lib/session";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Unauthorized", 401);

  const requestedId = new URL(request.url).searchParams.get("id");
  const resume = requestedId
    ? await prisma.resume.findFirst({ where: { id: requestedId, userId } })
    : (await prisma.resume.findFirst({ where: { userId, isDefault: true } })) ??
      (await prisma.resume.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }));
  if (!resume) return errorResponse("Resume not found", 404);

  if (!resume.storagePath) {
    if (/^https?:\/\//i.test(resume.fileUrl)) return Response.redirect(resume.fileUrl, 302);
    return errorResponse("Resume file is no longer available", 404);
  }

  try {
    const bytes = await readFile(resolveResumeStoragePath(userId, resume.storagePath));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": resume.mimeType ?? PDF_MIME_TYPE,
        "Content-Disposition": `attachment; filename="${sanitizeResumeFileName(resume.fileName)}"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse("Resume file is no longer available", 404);
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Unauthorized", 401);

  let writtenPath: string | null = null;

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > RESUME_MAX_FILE_SIZE + 1024 * 1024) {
      throw new ResumeUploadError("File is too large. The limit is 10 MB.", 413);
    }

    const formData = await request.formData();
    const value = formData.get("file");
    if (!value || typeof value === "string" || typeof (value as File).arrayBuffer !== "function") {
      throw new ResumeUploadError("Choose a PDF file to upload.", 400);
    }

    const file = value as File;
    validatePdfUpload(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(buffer)) {
      throw new ResumeUploadError("The file contents do not match a PDF file.", 400);
    }

    const nameValue = formData.get("name");
    const name =
      typeof nameValue === "string" && nameValue.trim()
        ? nameValue.trim().slice(0, 120)
        : resumeTitleFromFileName(file.name);

    const storageDir = absoluteResumeStorageDir(userId);
    await mkdir(storageDir, { recursive: true, mode: 0o700 });
    const storedName = `${randomUUID()}.pdf`;
    const absolutePath = path.join(storageDir, storedName);
    await writeFile(absolutePath, buffer, { mode: 0o600, flag: "wx" });
    writtenPath = absolutePath;

    const resume = await prisma.$transaction(async (tx) => {
      const created = await tx.resume.create({
        data: {
          userId,
          name,
          fileName: sanitizeResumeFileName(file.name),
          fileUrl: "/api/profile/resume",
          fileSize: file.size,
          mimeType: PDF_MIME_TYPE,
          storagePath: storedResumePath(userId, storedName),
          isDefault: false,
        },
      });

      const total = await tx.resume.count({ where: { userId } });
      return tx.resume.update({
        where: { id: created.id },
        data: {
          fileUrl: `/api/profile/resume?id=${created.id}`,
          isDefault: total === 1,
        },
      });
    });

    return Response.json({ resume: serializeResume(resume) }, { status: 201 });
  } catch (error) {
    if (writtenPath) await unlink(writtenPath).catch(() => undefined);
    if (error instanceof ResumeUploadError) return errorResponse(error.message, error.status);
    console.error("Resume upload failed", error);
    return errorResponse("Could not save the resume. Please try again.", 500);
  }
}
