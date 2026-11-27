"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ApplicationFormDialog,
  type ApplicationFormValues,
} from "@/components/applications/application-form-dialog";
import { deleteJson } from "@/lib/client-api";

export function ApplicationDetailActions({
  application,
  companies,
  resumes,
}: {
  application: ApplicationFormValues & { id: string; title: string };
  companies: { id: string; name: string }[];
  resumes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function handleDelete() {
    try {
      await deleteJson(`/api/applications/${application.id}`);
      toast.success(`${application.title} removed from your pipeline`);
      router.push("/applications");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete application");
      throw error;
    }
  }

  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit application
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary" aria-label="More application actions">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
            Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApplicationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companies={companies}
        resumes={resumes}
        application={application}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${application.title}?`}
        description="This removes the application and links to its outreach, events, tasks and activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
