"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
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
import { ContactFormDialog, type ContactFormValues } from "@/components/contacts/contact-form-dialog";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { deleteJson } from "@/lib/client-api";

export function ContactDetailActions({
  contact,
  companies,
}: {
  contact: ContactFormValues & { id: string; fullName: string };
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { openQuickAdd } = useQuickAdd();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function handleDelete() {
    try {
      await deleteJson(`/api/contacts/${contact.id}`);
      toast.success(`${contact.fullName} removed from your network`);
      router.push("/contacts");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete contact");
      throw error;
    }
  }

  return (
    <>
      <Button size="sm" variant="brand" onClick={() => openQuickAdd("follow-up", contact.companyId ?? undefined, contact.id)}>
        <CalendarClock className="h-3.5 w-3.5" />
        Schedule follow-up
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary" aria-label="More contact actions">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3" />
            Edit contact
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
            Delete contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContactFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companies={companies}
        contact={contact}
        defaultCompanyId={contact.companyId ?? undefined}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${contact.fullName}?`}
        description="This removes the contact and links to their outreach, reminders and activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
