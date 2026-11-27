"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyFormDialog, type CompanyFormValues } from "@/components/companies/company-form-dialog";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { deleteJson } from "@/lib/client-api";

export function CompanyDetailActions({ company }: { company: CompanyFormValues & { id: string; name: string } }) {
  const router = useRouter();
  const { openQuickAdd } = useQuickAdd();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function handleDelete() {
    await deleteJson(`/api/companies/${company.id}`);
    toast.success(`${company.name} removed`);
    router.push("/companies");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="brand" onClick={() => openQuickAdd("contact", company.id)}>
        <UserRound className="h-3.5 w-3.5" />
        Add contact
      </Button>
      <Button size="sm" variant="secondary" onClick={() => openQuickAdd("application", company.id)}>
        <BriefcaseBusiness className="h-3.5 w-3.5" />
        Add application
      </Button>
      <Button size="sm" variant="secondary" onClick={() => openQuickAdd("follow-up", company.id)}>
        <CalendarClock className="h-3.5 w-3.5" />
        Schedule follow-up
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="secondary" aria-label="More company actions">
            <Plus className="h-4 w-4 rotate-45" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3" />
            Edit company
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
            Delete company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CompanyFormDialog open={editOpen} onOpenChange={setEditOpen} company={company} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${company.name}?`}
        description="This removes the company and its applications, outreach and linked activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
