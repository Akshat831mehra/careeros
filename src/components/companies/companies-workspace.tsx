"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
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
import { CompanyFormDialog, type CompanyFormValues } from "@/components/companies/company-form-dialog";
import { deleteJson } from "@/lib/client-api";
import {
  COMPANY_STATUS_LABELS,
  COMPANY_STATUS_OPTIONS,
  COMPANY_STATUS_VARIANTS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  PRIORITY_VARIANTS,
} from "@/lib/constants";
import { cn, formatDate, initials } from "@/lib/utils";

export type CompanyRow = CompanyFormValues & {
  id: string;
  name: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "TARGET" | "CONTACTED" | "APPLIED" | "NOT_INTERESTED";
  createdAt: Date | string;
  _count: { applications: number; contacts: number; outreach: number };
};

type SortKey = "name" | "priority" | "status" | "applications" | "createdAt";
type SortDirection = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Company",
  priority: "Priority",
  status: "Status",
  applications: "Applications",
  createdAt: "Added",
};

const PRIORITY_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

export function CompaniesWorkspace({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CompanyRow | null>(null);
  const [deleting, setDeleting] = React.useState<CompanyRow | null>(null);

  const sorted = React.useMemo(() => {
    const rows = [...companies];
    rows.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "priority":
          comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          break;
        case "status":
          comparison = COMPANY_STATUS_LABELS[a.status].localeCompare(COMPANY_STATUS_LABELS[b.status]);
          break;
        case "applications":
          comparison = a._count.applications - b._count.applications;
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return rows;
  }, [companies, sortDirection, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function openEdit(company: CompanyRow) {
    setEditing(company);
    setFormOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/companies/${deleting.id}`);
      toast.success(`${deleting.name} removed from your list`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete company");
      throw error; // keeps the confirm dialog open
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
          (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <>
      <ListToolbar
        searchPlaceholder="Search companies, industries, locations…"
        count={companies.length}
        countLabel={companies.length === 1 ? "company" : "companies"}
        filters={[
          { key: "status", label: "Status", allLabel: "All statuses", options: COMPANY_STATUS_OPTIONS },
          { key: "priority", label: "Priority", allLabel: "All priorities", options: PRIORITY_OPTIONS },
        ]}
      >
        <Button size="sm" variant="brand" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Add company
        </Button>
      </ListToolbar>

      {sorted.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Building2 className="h-4.5 w-4.5" />
          </span>
          <p className="mt-1 text-[13px] font-medium text-foreground">No companies found</p>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Add a target company or adjust the search and filters to see more results.
          </p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add company
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-5 py-3"><SortHeader sort="name" /></th>
                    <th className="px-3 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Location</th>
                    <th className="px-3 py-3"><SortHeader sort="priority" /></th>
                    <th className="px-3 py-3"><SortHeader sort="status" /></th>
                    <th className="px-3 py-3"><SortHeader sort="applications" /></th>
                    <th className="px-3 py-3 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted">Contacts</th>
                    <th className="px-3 py-3"><SortHeader sort="createdAt" /></th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((company) => (
                    <tr key={company.id} className="group transition-colors hover:bg-surface-muted/50">
                      <td className="px-5 py-3">
                        <Link href={`/companies/${company.id}`} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-[10px] font-semibold text-muted-strong">
                            {company.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={company.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              initials(company.name)
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-medium text-foreground group-hover:text-brand">
                              {company.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-muted">
                              {company.industry || "No industry"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-[11.5px] text-muted-strong">
                        {company.location || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={PRIORITY_VARIANTS[company.priority]}>{PRIORITY_LABELS[company.priority]}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={COMPANY_STATUS_VARIANTS[company.status]}>
                          {COMPANY_STATUS_LABELS[company.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] tabular-nums text-muted-strong">
                        {company._count.applications}
                      </td>
                      <td className="px-3 py-3 text-[11.5px] tabular-nums text-muted-strong">
                        {company._count.contacts}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted">{formatDate(company.createdAt)}</td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${company.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/companies/${company.id}`}>View details</Link>
                            </DropdownMenuItem>
                            {company.website && (
                              <DropdownMenuItem asChild>
                                <a href={company.website} target="_blank" rel="noreferrer">
                                  Open website
                                  <ExternalLink className="ml-auto h-3 w-3" />
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => openEdit(company)}>
                              <Pencil className="h-3 w-3" />
                              Edit company
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(company)}>
                              <Trash2 className="h-3 w-3" />
                              Delete company
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

          {/* Mobile cards */}
          <div className="mt-4 space-y-2 md:hidden">
            {sorted.map((company) => (
              <Card key={company.id} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-[10px] font-semibold text-muted-strong">
                    {initials(company.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/companies/${company.id}`} className="text-[12.5px] font-medium text-foreground">
                      {company.name}
                    </Link>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {[company.industry, company.location].filter(Boolean).join(" · ") || "No details yet"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={COMPANY_STATUS_VARIANTS[company.status]}>
                        {COMPANY_STATUS_LABELS[company.status]}
                      </Badge>
                      <Badge variant={PRIORITY_VARIANTS[company.priority]}>
                        {PRIORITY_LABELS[company.priority]} priority
                      </Badge>
                    </div>
                    <p className="mt-2 text-[10px] text-muted">
                      {company._count.applications} applications · {company._count.contacts} contacts
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${company.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/companies/${company.id}`}>View details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEdit(company)}>
                        <Pencil className="h-3 w-3" />
                        Edit company
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(company)}>
                        <Trash2 className="h-3 w-3" />
                        Delete company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <CompanyFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "company"}?`}
        description="This removes the company and its applications, outreach and linked activity. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
