"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  BookmarkPlus,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleSlash,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { JobCaptureKind, JobCaptureStatus, JobSource } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/jobs/location-autocomplete";
import { RoleAutocomplete } from "@/components/jobs/role-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteJson, patchJson, postJson } from "@/lib/client-api";
import { savedSearchLocations } from "@/lib/location-utils";
import { deleteDraftByKey, useDraft } from "@/lib/use-draft";
import {
  JOB_CAPTURE_KIND_LABELS,
  JOB_CAPTURE_KIND_VARIANTS,
  JOB_CAPTURE_STATUS_LABELS,
  JOB_CAPTURE_STATUS_VARIANTS,
  JOB_SOURCE_LABELS,
  JOB_SOURCE_VARIANTS,
} from "@/lib/constants";
import {
  buildBookmarklet,
  buildPortalSearchLinks,
  JOB_PORTALS,
} from "@/lib/job-portals";
import { cn } from "@/lib/utils";

export type SavedSearchRow = {
  id: string;
  name: string;
  query: string;
  location: string | null;
  locations: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  postedWithinHours: number | null;
  sources: JobSource[];
  createdAt: string;
};

type SavedSearchDraft = {
  name: string;
  query: string;
  locations: string[];
  postedWithinHours: string;
  experienceMin: string;
  experienceMax: string;
  sources: JobSource[];
};

function initialSavedSearchDraft(search?: SavedSearchRow | null): SavedSearchDraft {
  return {
    name: search?.name ?? "",
    query: search?.query ?? "",
    locations: search ? savedSearchLocations(search) : [],
    postedWithinHours: String(search?.postedWithinHours ?? 24),
    experienceMin: search?.experienceMin === null || search?.experienceMin === undefined
      ? ""
      : String(search.experienceMin),
    experienceMax: search?.experienceMax === null || search?.experienceMax === undefined
      ? ""
      : String(search.experienceMax),
    sources: search ? [...search.sources] : [],
  };
}

export type CaptureRow = {
  id: string;
  source: JobSource;
  kind: JobCaptureKind;
  status: JobCaptureStatus;
  url: string;
  title: string;
  companyName: string;
  location: string | null;
  postedAt: string | null;
  searchQuery: string | null;
  createdAt: string;
  applicationId: string | null;
};

function copyText(value: string, message: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(message))
      .catch(() => toast.error("Could not copy to clipboard"));
  } else {
    toast.error("Clipboard unavailable in this browser");
  }
}

function Field({
  label,
  children,
  className,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function JobsWorkspace({
  token,
  baseUrl,
  savedSearches,
  captures,
}: {
  token: string;
  baseUrl: string;
  savedSearches: SavedSearchRow[];
  captures: CaptureRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<SavedSearchRow | null>(null);
  const { value: draft, setValue: setDraft, clearDraft } = useDraft<SavedSearchDraft>(
    `jobs:saved-search:${editing?.id ?? "new"}`,
    initialSavedSearchDraft(editing),
  );
  const { name, query, locations, postedWithinHours, experienceMin, experienceMax, sources } = draft;
  const [saving, setSaving] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const resultsBookmarklet = React.useMemo(
    () => buildBookmarklet({ token, apiBase: baseUrl, mode: "results" }),
    [token, baseUrl],
  );
  const appliedBookmarklet = React.useMemo(
    () => buildBookmarklet({ token, apiBase: baseUrl, mode: "applied" }),
    [token, baseUrl],
  );

  function toggleSource(source: JobSource) {
    setDraft((current) => ({
      ...current,
      sources: current.sources.includes(source)
        ? current.sources.filter((item) => item !== source)
        : [...current.sources, source],
    }));
  }

  async function resetForm() {
    await clearDraft();
    setEditing(null);
  }

  function startEdit(search: SavedSearchRow) {
    setEditing(search);
  }

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const number = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? Number(trimmed) : null;
    };
    const payload = {
      name,
      query,
      locations,
      experienceMin: number(experienceMin),
      experienceMax: number(experienceMax),
      postedWithinHours: number(postedWithinHours) ?? 24,
      sources,
    };

    try {
      if (editing) {
        await patchJson(`/api/saved-searches/${editing.id}`, payload);
      } else {
        await postJson("/api/saved-searches", payload);
      }
      toast.success(editing ? "Saved search updated" : "Saved search created");
      await resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not ${editing ? "update" : "create"} saved search`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSearch(id: string) {
    if (!window.confirm("Delete this saved search?")) return;
    setBusyId(id);
    try {
      await deleteJson(`/api/saved-searches/${id}`);
      await deleteDraftByKey(`jobs:saved-search:${id}`);
      if (editing?.id === id) await resetForm();
      toast.success("Saved search deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete saved search");
    } finally {
      setBusyId(null);
    }
  }

  async function regenerateToken() {
    setRegenerating(true);
    try {
      const data = await postJson<{ token: string }>("/api/integration-token", {});
      copyText(data.token, "New token copied — refresh your bookmarklets");
      toast.info("Old bookmarklets are now invalid");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not regenerate token");
    } finally {
      setRegenerating(false);
    }
  }

  async function updateCapture(id: string, status: JobCaptureStatus) {
    setBusyId(id);
    try {
      await patchJson(`/api/job-captures/${id}`, { status });
      toast.success(status === "IGNORED" ? "Capture ignored" : "Capture restored");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update capture");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCapture(id: string) {
    if (!window.confirm("Delete this capture? The linked application will remain.")) return;
    setBusyId(id);
    try {
      await deleteJson(`/api/job-captures/${id}`);
      toast.success("Capture deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete capture");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>One-click capture setup</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Drag these to your bookmarks bar. They read data from your own logged-in browser session.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={resultsBookmarklet}
              onClick={(event) => {
                event.preventDefault();
                copyText(resultsBookmarklet, "Search-result bookmarklet copied");
              }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-3 transition-colors hover:border-brand/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Search className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium text-foreground">Capture search results</span>
                <span className="block text-[10px] text-muted">Drag to bookmarks, then click on any results page</span>
              </span>
              <BookmarkPlus className="h-3.5 w-3.5 text-muted group-hover:text-brand" />
            </a>
            <a
              href={appliedBookmarklet}
              onClick={(event) => {
                event.preventDefault();
                copyText(appliedBookmarklet, "Applied-job bookmarklet copied");
              }}
              className="group flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-3 transition-colors hover:border-success/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium text-foreground">Capture applied job</span>
                <span className="block text-[10px] text-muted">Click on a job page after you apply</span>
              </span>
              <BookmarkPlus className="h-3.5 w-3.5 text-muted group-hover:text-success" />
            </a>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Capture token</span>
              <code className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-foreground">
                {token.slice(0, 10)}…{token.slice(-6)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => copyText(token, "Token copied")}
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                disabled={regenerating}
                onClick={regenerateToken}
              >
                {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Keep this token private. Regenerating it invalidates any bookmarklets you already saved — copy the new
              ones after regenerating.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Saved searches</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Choose one or more cities, then open the generated city-specific links across your selected portals.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Your Name" className="sm:col-span-1">
              <Input
                name="name"
                required
                value={name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. John Doe"
              />
            </Field>
            <Field
              label="Your Role"
              hint="Start typing to find a role, or enter your own title."
              className="sm:col-span-1"
            >
              <RoleAutocomplete
                name="query"
                required
                value={query}
                onChange={(next) => setDraft((current) => ({ ...current, query: next }))}
                placeholder="e.g. DevOps Engineer"
              />
            </Field>
            <Field label="Location" hint={editing ? "Edit or remove individual cities before updating." : "Choose one or more cities."}>
              <LocationAutocomplete
                values={locations}
                onChange={(next) => setDraft((current) => ({ ...current, locations: next }))}
              />
            </Field>
            <Field label="Posted within (hours)">
              <Input
                name="postedWithinHours"
                type="number"
                min={1}
                value={postedWithinHours}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, postedWithinHours: event.target.value }))
                }
              />
            </Field>
            <Field label="Min experience">
              <Input
                name="experienceMin"
                type="number"
                min={0}
                placeholder="1"
                value={experienceMin}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, experienceMin: event.target.value }))
                }
              />
            </Field>
            <Field label="Max experience">
              <Input
                name="experienceMax"
                type="number"
                min={0}
                placeholder="2"
                value={experienceMax}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, experienceMax: event.target.value }))
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Portals</Label>
              <div className="flex flex-wrap gap-2">
                {JOB_PORTALS.map((portal) => {
                  const checked = sources.includes(portal.source);
                  return (
                    <label
                      key={portal.source}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10.5px] transition-colors",
                        checked
                          ? "border-brand/30 bg-brand-soft text-brand"
                          : "border-border bg-surface text-muted hover:text-foreground",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleSource(portal.source)}
                      />
                      {checked && <CheckCircle2 className="h-3 w-3" />}
                      {portal.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="brand" disabled={saving || sources.length === 0}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editing ? (
                  <Pencil className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {editing ? "Update search" : "Save search"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={() => void resetForm()}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-2">
            {savedSearches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-[11.5px] text-muted">
                No saved searches yet. Add one above to generate portal links.
              </p>
            ) : (
              savedSearches.map((search) => {
                const searchCities = savedSearchLocations(search);
                const filters = {
                  query: search.query,
                  location: search.location,
                  locations: searchCities,
                  experienceMin: search.experienceMin,
                  experienceMax: search.experienceMax,
                  postedWithinHours: search.postedWithinHours,
                };
                const perSearchBookmarklet = buildBookmarklet({
                  token,
                  apiBase: baseUrl,
                  mode: "results",
                  savedSearchId: search.id,
                });

                return (
                  <div
                    key={search.id}
                    className={cn(
                      "rounded-lg border bg-surface-muted/40 px-3 py-2.5",
                      editing?.id === search.id ? "border-brand/40" : "border-border",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[11.5px] font-medium text-foreground">{search.name}</p>
                          {search.postedWithinHours && (
                            <Badge variant="outline">
                              <Clock3 className="h-3 w-3" /> {search.postedWithinHours}h
                            </Badge>
                          )}
                          {(search.experienceMin != null || search.experienceMax != null) && (
                            <Badge variant="outline">
                              {search.experienceMin ?? 0}–{search.experienceMax ?? "any"} yrs
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[10.5px] text-muted">
                          {search.query}
                          {searchCities.length > 0 ? ` · ${searchCities.join(", ")}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => startEdit(search)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => copyText(perSearchBookmarklet, "Search bookmarklet copied")}
                        >
                          <Copy className="h-3 w-3" /> Capture link
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-danger"
                          disabled={busyId === search.id}
                          onClick={() => deleteSearch(search.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {search.sources.flatMap((source) =>
                        buildPortalSearchLinks(source, filters).map((link) => (
                          <a
                            key={`${source}-${link.location || "all"}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-muted-strong transition-colors hover:text-brand"
                          >
                            <Badge variant={JOB_SOURCE_VARIANTS[source]} className="border-0 px-0">
                              {JOB_SOURCE_LABELS[source]}
                            </Badge>
                            {link.location && <span className="text-[9.5px] text-muted">· {link.location}</span>}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )),
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent captures</CardTitle>
            <p className="mt-1 text-[11px] text-muted">
              Every captured job is added to Applications and Companies automatically.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {captures.length === 0 ? (
            <p className="py-8 text-center text-[11.5px] text-muted">
              Nothing captured yet. Open a portal above and click the bookmarklet.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-[9.5px] uppercase tracking-[0.08em] text-muted">
                      <th className="pb-2 font-medium">Job</th>
                      <th className="pb-2 font-medium">Portal</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Captured</th>
                      <th className="pb-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {captures.map((capture) => (
                      <tr key={capture.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted">
                              <BriefcaseBusiness className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <a
                                href={capture.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block max-w-[280px] truncate text-[11.5px] font-medium text-foreground hover:text-brand"
                              >
                                {capture.title}
                              </a>
                              <p className="flex items-center gap-1 text-[10px] text-muted">
                                <Building2 className="h-2.5 w-2.5" /> {capture.companyName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={JOB_SOURCE_VARIANTS[capture.source]}>
                            {JOB_SOURCE_LABELS[capture.source]}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={JOB_CAPTURE_KIND_VARIANTS[capture.kind]}>
                            {JOB_CAPTURE_KIND_LABELS[capture.kind]}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-[10px] text-muted">
                          {formatDistanceToNow(new Date(capture.createdAt), { addSuffix: true })}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {capture.applicationId && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" asChild>
                                <Link href={`/applications/${capture.applicationId}`}>Open</Link>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              disabled={busyId === capture.id}
                              onClick={() =>
                                updateCapture(
                                  capture.id,
                                  capture.status === "IGNORED" ? "TRACKED" : "IGNORED",
                                )
                              }
                            >
                              {capture.status === "IGNORED" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <CircleSlash className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-danger"
                              disabled={busyId === capture.id}
                              onClick={() => deleteCapture(capture.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {captures.map((capture) => (
                  <div key={capture.id} className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <a href={capture.url} target="_blank" rel="noreferrer" className="block truncate text-[11.5px] font-medium text-foreground">
                          {capture.title}
                        </a>
                        <p className="mt-0.5 text-[10px] text-muted">{capture.companyName}</p>
                      </div>
                      <Badge variant={JOB_CAPTURE_KIND_VARIANTS[capture.kind]}>
                        {JOB_CAPTURE_KIND_LABELS[capture.kind]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={JOB_SOURCE_VARIANTS[capture.source]}>{JOB_SOURCE_LABELS[capture.source]}</Badge>
                      <Badge variant={JOB_CAPTURE_STATUS_VARIANTS[capture.status]}>
                        {JOB_CAPTURE_STATUS_LABELS[capture.status]}
                      </Badge>
                      <span className="ml-auto text-[10px] text-muted">
                        {formatDistanceToNow(new Date(capture.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {capture.applicationId && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" asChild>
                          <Link href={`/applications/${capture.applicationId}`}>Open application</Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() =>
                          updateCapture(capture.id, capture.status === "IGNORED" ? "TRACKED" : "IGNORED")
                        }
                      >
                        {capture.status === "IGNORED" ? "Restore" : "Ignore"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-danger"
                        onClick={() => deleteCapture(capture.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
