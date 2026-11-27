export const RESUME_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";

export class ResumeUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function sanitizeResumeFileName(fileName: string) {
  const safe = fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return safe || "resume.pdf";
}

export function resumeTitleFromFileName(fileName: string) {
  const base = sanitizeResumeFileName(fileName)
    .replace(/\.pdf$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.length >= 2 ? base.slice(0, 120) : "Resume";
}

export function validatePdfUpload(file: File) {
  if (file.size === 0) {
    throw new ResumeUploadError("That file is empty. Choose a PDF to upload.", 400);
  }
  if (file.size > RESUME_MAX_FILE_SIZE) {
    throw new ResumeUploadError("File is too large. The limit is 10 MB.", 413);
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf") {
    throw new ResumeUploadError("Only PDF files are accepted.", 400);
  }
  if (file.type && file.type !== PDF_MIME_TYPE && file.type !== "application/octet-stream") {
    throw new ResumeUploadError("Only PDF files are accepted.", 400);
  }
}

export function hasPdfSignature(bytes: Uint8Array) {
  if (bytes.length < 5) return false;
  return String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
}
