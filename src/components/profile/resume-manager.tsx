"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, FileText, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteJson, patchJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import {
  RESUME_MAX_FILE_SIZE,
  resumeTitleFromFileName,
  sanitizeResumeFileName,
  validatePdfUpload,
} from "@/lib/resume-utils";

export type ResumeItem = {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type UploadState = {
  current: number;
  total: number;
  progress: number;
  fileName: string;
} | null;

function formatBytes(bytes: number | null) {
  if (bytes === null) return "Size unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function uploadResume(
  file: File,
  name: string,
  onProgress: (progress: number) => void,
): Promise<{ resume: ResumeItem }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/profile/resume");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data: { resume?: ResumeItem; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText) as typeof data;
      } catch {
        data = { error: "Could not read the upload response. Please try again." };
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.resume) {
        resolve({ resume: data.resume });
      } else {
        reject(new Error(data.error ?? "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error. Please check your connection and try again."));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    xhr.send(formData);
  });
}

export function ResumeManager({ resumes }: { resumes: ResumeItem[] }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState(resumes);
  const [uploadState, setUploadState] = React.useState<UploadState>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<ResumeItem | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const uploading = uploadState !== null;

  function handleFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length || uploading) return;

    setError(null);
    const validFiles: File[] = [];
    for (const file of selected) {
      try {
        validatePdfUpload(file);
        validFiles.push(file);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Invalid PDF file.";
        toast.error(`${file.name}: ${message}`);
      }
    }
    if (!validFiles.length) return;

    void (async () => {
      for (const [index, file] of validFiles.entries()) {
        setUploadState({
          current: index + 1,
          total: validFiles.length,
          progress: 0,
          fileName: file.name,
        });

        try {
          const { resume } = await uploadResume(
            file,
            resumeTitleFromFileName(file.name),
            (progress) =>
              setUploadState((state) => (state ? { ...state, progress } : state)),
          );
          setItems((current) => [
            ...current.map((item) => ({ ...item, isDefault: resume.isDefault ? false : item.isDefault })),
            resume,
          ]);
          toast.success(`${resume.name} added`);
          router.refresh();
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Could not upload this resume.";
          setError(message);
          toast.error(`${file.name}: ${message}`);
        }
      }
      setUploadState(null);
    })();
  }

  async function setDefault(resume: ResumeItem) {
    if (resume.isDefault || uploading || busyId) return;
    setBusyId(resume.id);
    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, isDefault: item.id === resume.id })));

    try {
      const { resume: updated } = await patchJson<{ resume: ResumeItem }>(`/api/resumes/${resume.id}`, {
        isDefault: true,
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : { ...item, isDefault: false })),
      );
      toast.success(`${updated.name} is now your default`);
      router.refresh();
    } catch (caught) {
      setItems(previous);
      toast.error(caught instanceof Error ? caught.message : "Could not update the default resume");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);

    try {
      const { defaultResumeId } = await deleteJson<{ ok: true; defaultResumeId: string | null }>(
        `/api/resumes/${deleting.id}`,
      );
      setItems((current) => {
        const next = current.filter((item) => item.id !== deleting.id);
        return next.map((item) => ({ ...item, isDefault: item.id === defaultResumeId }));
      });
      toast.success(`${deleting.name} removed`);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not delete this resume");
      throw caught;
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">Resume versions</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted">
            Keep tailored PDF versions for different roles. One is used as your default wherever a resume is needed.
          </p>
        </div>
        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add New Version
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {uploadState && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-muted">
            <span className="flex min-w-0 items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="truncate">
                Uploading {uploadState.fileName}
                {uploadState.total > 1 ? ` (${uploadState.current} of ${uploadState.total})` : ""}
              </span>
            </span>
            <span className="shrink-0">{uploadState.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface-muted/40 px-4 py-8 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-soft text-danger">
              <FileText className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-[12.5px] font-medium text-foreground">No resume versions yet</p>
            <p className="mt-1 text-[11.5px] text-muted">
              Add a PDF to start your tailored resume library. PDF only, up to{" "}
              {Math.round(RESUME_MAX_FILE_SIZE / (1024 * 1024))} MB each.
            </p>
          </div>
        ) : (
          items.map((resume) => (
            <div
              key={resume.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                resume.isDefault
                  ? "border-brand/30 bg-brand-soft/25"
                  : "border-border bg-surface-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  resume.isDefault ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger",
                )}
              >
                <FileText className="h-4 w-4" />
              </span>

              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-[12px] font-medium text-foreground">{resume.name}</p>
                  {resume.isDefault && (
                    <Badge variant="brand">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Default
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-muted">
                  {resume.fileName} · {formatBytes(resume.fileSize)} · added {formatDate(resume.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Set ${resume.name} as default`}
                  title={resume.isDefault ? "Default resume" : "Set as default"}
                  disabled={resume.isDefault || uploading || busyId === resume.id}
                  onClick={() => void setDefault(resume)}
                  className={resume.isDefault ? "text-brand" : "text-muted"}
                >
                  <Star className={cn("h-3.5 w-3.5", resume.isDefault && "fill-current")} />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  asChild
                  aria-label={`Download ${resume.name}`}
                  title={`Download ${resume.name}`}
                >
                  <a href={resume.fileUrl} download={sanitizeResumeFileName(resume.fileName)}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Delete ${resume.name}`}
                  title={`Delete ${resume.name}`}
                  className="text-muted hover:text-danger"
                  disabled={uploading || busyId === resume.id}
                  onClick={() => setDeleting(resume)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "resume"}?`}
        description="This removes the stored PDF and cannot be undone. Applications linked to this version will keep their title."
        onConfirm={() => handleDelete()}
      />
    </section>
  );
}
