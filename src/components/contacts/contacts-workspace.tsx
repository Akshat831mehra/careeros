"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListToolbar } from "@/components/modules/list-toolbar";
import { ContactFormDialog, type ContactFormValues } from "@/components/contacts/contact-form-dialog";
import { LinkedinIcon } from "@/components/icons";
import { deleteJson } from "@/lib/client-api";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_OPTIONS,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_STATUS_OPTIONS,
  RELATIONSHIP_STATUS_VARIANTS,
} from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export type ContactRow = ContactFormValues & {
  id: string;
  fullName: string;
  type: keyof typeof CONTACT_TYPE_LABELS;
  relationship: keyof typeof RELATIONSHIP_STATUS_LABELS;
  createdAt: Date | string;
  company: { id: string; name: string } | null;
  _count: { outreach: number; events: number; tasks: number };
};

type SortKey = "name" | "company" | "type" | "relationship" | "createdAt";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  company: "Company",
  type: "Type",
  relationship: "Relationship",
  createdAt: "Added",
};

export function ContactsWorkspace({
  contacts,
  companies,
}: {
  contacts: ContactRow[];
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ContactRow | null>(null);
  const [deleting, setDeleting] = React.useState<ContactRow | null>(null);

  const sorted = React.useMemo(() => {
    const rows = [...contacts];
    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "company":
          comparison = (a.company?.name ?? "").localeCompare(b.company?.name ?? "");
          break;
        case "type":
          comparison = CONTACT_TYPE_LABELS[a.type].localeCompare(CONTACT_TYPE_LABELS[b.type]);
          break;
        case "relationship":
          comparison = RELATIONSHIP_STATUS_LABELS[a.relationship].localeCompare(
            RELATIONSHIP_STATUS_LABELS[b.relationship],
          );
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return rows;
  }, [contacts, direction, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/contacts/${deleting.id}`);
      toast.success(`${deleting.fullName} removed from your network`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete contact");
      throw error;
    }
  }

  function SortHeader({ sort }: { sort: SortKey }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(sort)}
        className={cn(
          "inline-flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.08em] transition-colors hover:text-foreground",
          sortKey === sort ? "text-foreground" : "text-muted",
        )}
      >
        {SORT_LABELS[sort]}
        {sortKey === sort &&
          (direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search people, roles, emails…"
        count={contacts.length}
        countLabel={contacts.length === 1 ? "contact" : "contacts"}
        filters={[
          {
            key: "company",
            label: "Company",
            allLabel: "All companies",
            options: companies.map((company) => ({ value: company.id, label: company.name })),
          },
          { key: "type", label: "Type", allLabel: "All types", options: CONTACT_TYPE_OPTIONS },
          {
            key: "relationship",
            label: "Relationship",
            allLabel: "All relationships",
            options: RELATIONSHIP_STATUS_OPTIONS,
          },
        ]}
      >
        <Button
          size="sm"
          variant="brand"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add contact
        </Button>
      </ListToolbar>

      {sorted.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <UserRound className="h-4.5 w-4.5" />
          </span>
          <p className="mt-1 text-[13px] font-medium text-foreground">No contacts found</p>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Add a recruiter or hiring manager, or adjust the filters to see more people.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-5 py-3"><SortHeader sort="name" /></th>
                    <th className="px-3 py-3"><SortHeader sort="company" /></th>
                    <th className="px-3 py-3"><SortHeader sort="type" /></th>
                    <th className="px-3 py-3"><SortHeader sort="relationship" /></th>
                    <th className="px-3 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Contact</th>
                    <th className="px-3 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Outreach</th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((contact) => (
                    <tr key={contact.id} className="group transition-colors hover:bg-surface-muted/50">
                      <td className="px-5 py-3">
                        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                          {contact.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={contact.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                              {initials(contact.fullName)}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-medium text-foreground group-hover:text-brand">
                              {contact.fullName}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-muted">
                              {contact.designation || CONTACT_TYPE_LABELS[contact.type]}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-3 text-[11.5px] text-muted-strong">
                        {contact.company?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-strong">{CONTACT_TYPE_LABELS[contact.type]}</td>
                      <td className="px-3 py-3">
                        <Badge variant={RELATIONSHIP_STATUS_VARIANTS[contact.relationship]}>
                          {RELATIONSHIP_STATUS_LABELS[contact.relationship]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-muted">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="transition-colors hover:text-brand" aria-label="Email">
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.linkedinUrl && (
                            <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-brand" aria-label="LinkedIn">
                              <LinkedinIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {!contact.email && !contact.linkedinUrl && "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] tabular-nums text-muted-strong">{contact._count.outreach}</td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${contact.fullName}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/contacts/${contact.id}`}>View profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => { setEditing(contact); setFormOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                              Edit contact
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(contact)}>
                              <Trash2 className="h-3 w-3" />
                              Delete contact
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 space-y-2 md:hidden">
            {sorted.map((contact) => (
              <Card key={contact.id} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                    {initials(contact.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/contacts/${contact.id}`} className="text-[12.5px] font-medium text-foreground">
                      {contact.fullName}
                    </Link>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {[contact.designation, contact.company?.name].filter(Boolean).join(" · ") || "No details"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={RELATIONSHIP_STATUS_VARIANTS[contact.relationship]}>
                        {RELATIONSHIP_STATUS_LABELS[contact.relationship]}
                      </Badge>
                      <Badge variant="outline">{CONTACT_TYPE_LABELS[contact.type]}</Badge>
                    </div>
                    <p className="mt-2 text-[10px] text-muted">{contact._count.outreach} outreach records</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${contact.fullName}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/contacts/${contact.id}`}>View profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setEditing(contact); setFormOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                        Edit contact
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(contact)}>
                        <Trash2 className="h-3 w-3" />
                        Delete contact
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ContactFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        contact={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.fullName ?? "contact"}?`}
        description="This removes the contact and links to their outreach, reminders and activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
