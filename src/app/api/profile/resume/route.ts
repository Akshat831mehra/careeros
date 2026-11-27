import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ALLOWED_EXTENSIONS = ["pdf", "docx"] as const;
const STORAGE_ROOT = path.join(process.cwd(), ".data", "resumes");

class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function sanitizeFileName(fileName: string) {
  const safe = path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return safe || "resume.pdf";
}

function hasExpectedMagicBytes(buffer: Buffer, extension: string) {
  if (extension === "pdf") return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  return buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2] ?? 0);
}

function resolveStoredPath(relativePath: string) {
  const resolved = path.resolve(STORAGE_ROOT, relativePath);
  if (!resolved.startsWith(`${STORAGE_ROOT}${path.sep}`)) {
    throw new UploadError("Invalid stored resume path", 500);
  }
  return resolved;
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Unauthorized", 401);

  const resume = await prisma.resume.findFirst({
    where: { userId, storagePath: { not: null } },
    orderBy: { updatedAt: "desc" },
  });
  if (!resume?.storagePath) return errorResponse("No resume uploaded", 404);

  try {
    const bytes = await readFile(resolveStoredPath(resume.storagePath));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": resume.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${sanitizeFileName(resume.fileName)}"`,
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

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_SIZE + 1024 * 1024) {
      throw new UploadError("File is too large. The limit is 10 MB.", 413);
    }

    const formData = await request.formData();
    const value = formData.get("file");
    if (!value || typeof value === "string" || typeof (value as File).arrayBuffer !== "function") {
      throw new UploadError("Choose a PDF or DOCX file to upload.", 400);
    }

    const file = value as File;
    const extension = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new UploadError("Only PDF and DOCX files are accepted.", 400);
    }
    if (file.type && file.type !== PDF_MIME && file.type !== DOCX_MIME) {
      throw new UploadError("Only PDF and DOCX files are accepted.", 400);
    }
    if (file.size === 0) throw new UploadError("That file is empty.", 400);
    if (file.size > MAX_FILE_SIZE) throw new UploadError("File is too large. The limit is 10 MB.", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedMagicBytes(buffer, extension)) {
      throw new UploadError("The file contents do not match a PDF or DOCX file.", 400);
    }

    const storageRoot = path.join(STORAGE_ROOT, userId);
    await mkdir(storageRoot, { recursive: true, mode: 0o700 });
    const storedName = `${randomUUID()}.${extension}`;
    const absolutePath = path.join(storageRoot, storedName);
    await writeFile(absolutePath, buffer, { mode: 0o600, flag: "wx" });

    const existing = await prisma.resume.findFirst({
      where: { userId, storagePath: { not: null } },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      name: "Resume",
      fileName: sanitizeFileName(file.name),
      fileUrl: "/api/profile/resume",
      fileSize: file.size,
      mimeType: extension === "pdf" ? PDF_MIME : DOCX_MIME,
      storagePath: path.join(/* turbopackIgnore: true */ userId, storedName),
      isDefault: true,
      updatedAt: new Date(),
    };

    let resume;
    try {
      resume = existing
        ? await prisma.resume.update({ where: { id: existing.id }, data })
        : await prisma.resume.create({ data: { userId, ...data } });
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }

    if (existing?.storagePath) {
      await unlink(resolveStoredPath(existing.storagePath)).catch(() => undefined);
    }

    return Response.json({
      resume: {
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        updatedAt: resume.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof UploadError) return errorResponse(error.message, error.status);
    console.error("Resume upload failed", error);
    return errorResponse("Could not save the resume. Please try again.", 500);
  }
}
