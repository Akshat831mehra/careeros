"use client";

import * as React from "react";
import { AlertCircle, BriefcaseBusiness, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_JOB_TITLE_LENGTH,
  normalizeJobTitle,
  type JobTitleOption,
} from "@/lib/job-title-utils";

type CustomOption = {
  id: string;
  label: string;
  title: string;
  category: string;
  kind: "Custom";
};

type RoleOption = JobTitleOption | CustomOption;
type LookupStatus = "idle" | "loading" | "ready" | "empty" | "error";

export function RoleAutocomplete({
  value,
  onChange,
  placeholder = "Search a role or keyword...",
  id,
  name = "query",
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const generatedId = React.useId();
  const inputId = id ?? `${generatedId}-input`;
  const listboxId = `${inputId}-options`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestIdRef = React.useRef(0);

  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<JobTitleOption[]>([]);
  const [status, setStatus] = React.useState<LookupStatus>("idle");
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const term = value.trim();
  const showPanel = open && term.length >= 1;

  React.useEffect(() => {
    if (!showPanel) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSuggestions([]);
      setStatus("loading");
      setActiveIndex(-1);

      try {
        const response = await fetch(`/api/job-titles/autocomplete?q=${encodeURIComponent(term)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          suggestions?: JobTitleOption[];
          error?: string;
        };

        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        if (!response.ok) throw new Error(payload.error ?? "Role lookup failed");

        const next = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        setSuggestions(next);
        setStatus(next.length > 0 ? "ready" : "empty");
      } catch {
        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        setSuggestions([]);
        setStatus("error");
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, showPanel]);

  const hasExactSuggestion = suggestions.some(
    (suggestion) => normalizeJobTitle(suggestion.title) === normalizeJobTitle(term),
  );
  const displayStatus = status === "ready" && suggestions.length === 0 ? "empty" : status;

  const options: RoleOption[] = React.useMemo(() => {
    if (!showPanel || displayStatus === "loading") return [];

    const next: RoleOption[] = [...suggestions];
    if (term && !hasExactSuggestion) {
      next.push({
        id: "custom",
        label: term,
        title: term,
        category: "Custom role",
        kind: "Custom",
      });
    }
    return next;
  }, [showPanel, displayStatus, suggestions, term, hasExactSuggestion]);

  const activeOption =
    activeIndex >= 0 && activeIndex < options.length ? options[activeIndex] : null;
  const activeOptionId = showPanel && activeOption ? `${listboxId}-${activeIndex}` : undefined;

  function closePanel() {
    requestIdRef.current += 1;
    setOpen(false);
    setSuggestions([]);
    setStatus("idle");
    setActiveIndex(-1);
  }

  function commit(valueToCommit: string) {
    const next = valueToCommit.trim();
    onChange(next);
    closePanel();
    inputRef.current?.focus();
  }

  function clearValue() {
    requestIdRef.current += 1;
    onChange("");
    setSuggestions([]);
    setStatus("idle");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!open) setOpen(true);
      if (options.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % options.length);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      if (options.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
      }
      return;
    }

    if (event.key === "Enter" && showPanel) {
      if (activeOption) {
        event.preventDefault();
        commit(activeOption.title);
      } else if (term) {
        event.preventDefault();
        commit(term);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      closePanel();
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closePanel();
      }}
    >
      <div
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground transition-colors",
          "focus-within:border-brand/40",
        )}
      >
        <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          required={required}
          maxLength={MAX_JOB_TITLE_LENGTH}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setSuggestions([]);
            setStatus("loading");
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (value.trim().length >= 1 && status === "idle") setStatus("loading");
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-label="Role or keywords"
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-foreground outline-none placeholder:text-muted/70 focus-visible:outline-none!"
        />

        {showPanel && status === "loading" && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted" aria-hidden="true" />
        )}

        {value && (
          <button
            type="button"
            aria-label="Clear role"
            title="Clear role"
            onClick={(event) => {
              event.stopPropagation();
              clearValue();
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div
            id={listboxId}
            role="listbox"
            aria-label="Role suggestions"
            className="max-h-64 overflow-y-auto py-1"
          >
            {displayStatus === "loading" && (
              <div role="status" aria-live="polite" className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding roles…
              </div>
            )}

            {displayStatus === "empty" && (
              <div role="status" aria-live="polite" className="px-3 py-2.5 text-[11px] text-muted">
                No matching roles yet. You can still use “{term}” as a custom title.
              </div>
            )}

            {displayStatus === "error" && (
              <div role="alert" className="flex items-start gap-2 px-3 py-2.5 text-[11px] text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Couldn’t load role suggestions. “{term}” can still be saved as a custom title.
                </span>
              </div>
            )}

            {options.map((option, index) => (
              <button
                key={option.kind === "Custom" ? "custom" : option.id}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={(event) => {
                  event.stopPropagation();
                  commit(option.title);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                  index === activeIndex ? "bg-brand-soft" : "hover:bg-surface-muted",
                )}
              >
                {option.kind === "Custom" ? (
                  <Plus className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                ) : (
                  <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">
                  {option.kind === "Custom" ? `Use “${option.title}” as a custom title` : option.title}
                </span>
                {option.category && (
                  <span className="shrink-0 text-[9px] text-muted">{option.category}</span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-[9px] text-muted">
            Roles come from saved job titles. Custom titles are always allowed.
          </div>
        </div>
      )}
    </div>
  );
}
