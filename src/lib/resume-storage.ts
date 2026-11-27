import { unlink } from "node:fs/promises";
import path from "node:path";
import type { Resume } from "@prisma/client";
import { ResumeUploadError } from "@/lib/resume-utils";

const STORAGE_ROOT = path.join(process.cwd(), ".data", "resumes");

export type ResumeDto = Pick<
  Resume,
  "id" | "name" | "fileName" | "fileUrl" | "fileSize" | "mimeType" | "isDefault"
> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeResume(resume: Resume): ResumeDto {
  return {
    id: resume.id,
    name: resume.name,
    fileName: resume.fileName,
    fileUrl: resume.fileUrl,
    fileSize: resume.fileSize,
    mimeType: resume.mimeType,
    isDefault: resume.isDefault,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };
}

export function storedResumePath(userId: string, storedName: string) {
  return path.join(userId, storedName);
}

export function resolveResumeStoragePath(userId: string, relativePath: string) {
  const userRoot = path.resolve(STORAGE_ROOT, userId);
  const resolved = path.resolve(STORAGE_ROOT, relativePath);
  if (resolved !== userRoot && !resolved.startsWith(`${userRoot}${path.sep}`)) {
    throw new ResumeUploadError("Invalid stored resume path", 500);
  }
  return resolved;
}

export function absoluteResumeStorageDir(userId: string) {
  return path.resolve(STORAGE_ROOT, userId);
}

export async function removeStoredResumeFile(userId: string, relativePath: string | null) {
  if (!relativePath) return;
  try {
    await unlink(resolveResumeStoragePath(userId, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Could not remove stored resume file", error);
    }
  }
}
