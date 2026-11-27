"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteJson, patchJson, postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export type ResumeItem = {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  isDefault: boolean;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "PDF";
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ResumeManager({ resumes }: { resumes: ResumeItem[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(resumes);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ResumeItem | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(resumes), [resumes]);

  async function handleAdd(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(formEvent.currentTarget);
    const size = fd.get("fileSize");

    try {
      const { resume } = await postJson<{ resume: ResumeItem }>("/api/resumes", {
        name: fd.get("name"),
        fileName: fd.get("fileName"),
        fileUrl: fd.get("fileUrl"),
        fileSize: size ? Number(size) : null,
      });
      setItems((current) => [
        ...current.map((item) => ({ ...item, isDefault: false })),
        resume,
      ]);
      toast.success("Resume version added");
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add resume");
    } finally {
      setPending(false);
    }
  }

  async function setDefault(resume: ResumeItem) {
    if (resume.isDefault) return;
    setBusyId(resume.id);
    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, isDefault: item.id === resume.id })));
    try {
      await patchJson(`/api/resumes/${resume.id}`, { isDefault: true });
      toast.success(`${resume.name} is now your default`);
      router.refresh();
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Could not update resume");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteJson(`/api/resumes/${deleting.id}`);
      setItems((current) => {
        const next = current.filter((item) => item.id !== deleting.id);
        return deleting.isDefault && next.length > 0
          ? next.map((item, index) => ({ ...item, isDefault: index === 0 }))
          : next;
      });
      toast.success(`${deleting.name} removed`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete resume");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-[11.5px] text-muted">No resume versions saved yet.</p>
        ) : (
          items.map((resume) => (
            <div
              key={resume.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-2.5",
                resume.isDefault && "border-brand/30 bg-brand-soft/30",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[11.5px] font-medium text-foreground">{resume.name}</p>
                  {resume.isDefault && <Badge variant="brand">Default</Badge>}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  {resume.fileName} · {formatBytes(resume.fileSize)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Set ${resume.name} as default`}
                  disabled={resume.isDefault || busyId === resume.id}
                  onClick={() => void setDefault(resume)}
                  className={resume.isDefault ? "text-brand" : "text-muted"}
                >
                  <Star className={cn("h-3.5 w-3.5", resume.isDefault && "fill-current")} />
                </Button>
                <Button size="icon-xs" variant="ghost" asChild aria-label={`Download ${resume.name}`}>
                  <a href={resume.fileUrl} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Delete ${resume.name}`}
                  className="text-muted hover:text-danger"
                  onClick={() => setDeleting(resume)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Button size="xs" variant="secondary" className="mt-3" onClick={() => { setError(null); setFormOpen(true); }}>
        <Plus className="h-3 w-3" />
        Add version
      </Button>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogHeader className="border-b border-border bg-surface-muted/40">
            <DialogTitle>Add a resume version</DialogTitle>
            <DialogDescription>
              Link a resume you already host (Drive, Dropbox, your site) so it stays attached to applications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4 p-5">
              <div>
                <Label className="mb-1.5 block">Version name</Label>
                <Input name="name" required placeholder="DevOps resume · 2026" autoFocus />
              </div>
              <div>
                <Label className="mb-1.5 block">File name</Label>
                <Input name="fileName" required placeholder="careeros-resume-devops.pdf" />
              </div>
              <div>
                <Label className="mb-1.5 block">Link</Label>
                <Input name="fileUrl" type="url" required placeholder="https://drive.google.com/…" />
              </div>
              <div>
                <Label className="mb-1.5 block">Size in KB (optional)</Label>
                <Input name="fileSize" type="number" min="0" placeholder="245" />
              </div>
              {error && (
                <div className="rounded-lg border border-danger/15 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="brand" disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "resume"}?`}
        description="Applications linked to this version will keep their title but lose the file link. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
