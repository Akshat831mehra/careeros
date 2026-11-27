"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedResume = {
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  updatedAt: string;
} | null;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ACCEPTED_EXTENSIONS = ["pdf", "docx"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function validateFile(file: File) {
  if (file.size === 0) return "That file is empty. Choose a PDF or DOCX file.";
  if (file.size > MAX_FILE_SIZE) return "File is too large. The limit is 10 MB.";
  const extension = fileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return "Only PDF and DOCX files are accepted.";
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type)) return "Only PDF and DOCX files are accepted.";
  return null;
}

export function ResumeUpload({ resume }: { resume: UploadedResume }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selected, setSelected] = React.useState<File | null>(null);
  const [justUploaded, setJustUploaded] = React.useState<NonNullable<UploadedResume> | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const currentResume = justUploaded ?? resume;

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setProgress(0);
    const issue = validateFile(file);
    if (issue) {
      setSelected(null);
      setError(issue);
      return;
    }
    setSelected(file);
  }

  function upload() {
    if (!selected || uploading) return;
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", selected);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/profile/resume");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      let data: { error?: string; resume?: NonNullable<UploadedResume> } = {};
      try {
        data = JSON.parse(xhr.responseText) as typeof data;
      } catch {
        data = { error: "Could not read the upload response. Please try again." };
      }
      if (xhr.status === 200 && data.resume) {
        setJustUploaded(data.resume);
        setSelected(null);
        setProgress(100);
        setSuccess(`${data.resume.fileName} saved.`);
        toast.success("Resume saved");
        router.refresh();
      } else {
        setProgress(0);
        const message = data.error ?? "Upload failed. Please try again.";
        setError(message);
        toast.error(message);
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setProgress(0);
      const message = "Network error. Please check your connection and try again.";
      setError(message);
      toast.error(message);
    };
    xhr.send(formData);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">Resume</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Upload one resume for your job search. PDF or DOCX, up to 10 MB. Your file is stored privately.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors sm:py-10",
          dragging ? "border-brand bg-brand-soft/50" : "border-border-strong bg-surface-muted/40",
        )}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-brand">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="text-[13px] font-medium text-foreground">Drag and drop your resume here</p>
        <p className="mt-1 text-[11.5px] text-muted">PDF or DOCX · maximum 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Browse files
        </Button>
      </div>

      {selected && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">{selected.name}</p>
            <p className="text-[10.5px] text-muted">{formatBytes(selected.size)} · ready to upload</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Clear selected file"
            onClick={() => {
              setSelected(null);
              setError(null);
              setSuccess(null);
              setProgress(0);
            }}
            disabled={uploading}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-success/15 bg-success-soft px-3 py-2 text-[12px] text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {success}
        </div>
      )}

      {currentResume && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">{currentResume.fileName}</p>
            <p className="text-[10.5px] text-muted">
              {currentResume.fileSize ? formatBytes(currentResume.fileSize) : "Size unknown"} · saved resume
            </p>
          </div>
          <span className="text-[10.5px] text-muted">Current</span>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="brand" size="sm" onClick={upload} disabled={!selected || uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : currentResume ? "Replace resume" : "Upload resume"}
        </Button>
      </div>
    </section>
  );
}
