"use client";

import * as React from "react";
import { AlertCircle, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

type CitySuggestion = {
  id: string;
  label: string;
  name: string;
  city: string;
  state: string;
  country: string;
  context: string;
  kind: "City";
};

type LookupStatus = "idle" | "loading" | "ready" | "empty" | "error";

export function LocationAutocomplete({
  values,
  onChange,
  placeholder = "Search city...",
  id,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const generatedId = React.useId();
  const inputId = id ?? `${generatedId}-input`;
  const listboxId = `${inputId}-options`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestIdRef = React.useRef(0);

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<CitySuggestion[]>([]);
  const [status, setStatus] = React.useState<LookupStatus>("idle");
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const term = query.trim();
  const showPanel = open && term.length >= 1;
  const selectedKeys = new Set(values.map((value) => value.trim().toLowerCase()));

  const availableSuggestions = suggestions.filter(
    (suggestion) => !selectedKeys.has(suggestion.label.trim().toLowerCase()),
  );
  const activeSuggestionIndex =
    activeIndex >= 0 && activeIndex < availableSuggestions.length ? activeIndex : -1;
  const allMatchesSelected = status === "ready" && suggestions.length > 0 && availableSuggestions.length === 0;
  const displayStatus = status === "ready" && availableSuggestions.length === 0 ? "empty" : status;

  React.useEffect(() => {
    if (!showPanel) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSuggestions([]);
      setStatus("loading");
      setActiveIndex(-1);

      try {
        const response = await fetch(`/api/locations/autocomplete?q=${encodeURIComponent(term)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          suggestions?: CitySuggestion[];
          error?: string;
        };

        if (requestId !== requestIdRef.current || controller.signal.aborted) return;
        if (!response.ok) throw new Error(payload.error ?? "City lookup failed");

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

  function addCity(city: string) {
    const normalized = city.trim();
    if (!normalized || selectedKeys.has(normalized.toLowerCase())) return;
    onChange([...values, normalized]);
  }

  function selectSuggestion(suggestion: CitySuggestion) {
    addCity(suggestion.label);
    setQuery("");
    setSuggestions([]);
    setStatus("idle");
    setActiveIndex(-1);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeCity(index: number) {
    onChange(values.filter((_, current) => current !== index));
    setActiveIndex(-1);
  }

  function clearQuery() {
    requestIdRef.current += 1;
    setQuery("");
    setSuggestions([]);
    setStatus("idle");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !query && values.length > 0) {
      event.preventDefault();
      removeCity(values.length - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      if (!open) setOpen(true);
      if (displayStatus === "ready" && availableSuggestions.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % availableSuggestions.length);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      if (displayStatus === "ready" && availableSuggestions.length > 0) {
        event.preventDefault();
        setActiveIndex((current) =>
          current <= 0 ? availableSuggestions.length - 1 : current - 1,
        );
      }
      return;
    }

    if (event.key === "Enter") {
      const selected =
        displayStatus === "ready" && activeSuggestionIndex >= 0
          ? availableSuggestions[activeSuggestionIndex]
          : null;
      if (selected) {
        event.preventDefault();
        selectSuggestion(selected);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const activeOptionId =
    showPanel && displayStatus === "ready" && activeSuggestionIndex >= 0
      ? `${listboxId}-${activeSuggestionIndex}`
      : undefined;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-[13px] text-foreground transition-colors",
          "focus-within:border-brand/40",
        )}
      >
        {values.map((city, index) => (
          <span
            key={`${city}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand"
          >
            <span className="truncate">{city}</span>
            <button
              type="button"
              aria-label={`Remove ${city}`}
              title={`Remove ${city}`}
              onClick={(event) => {
                event.stopPropagation();
                removeCity(index);
              }}
              className="rounded-sm p-0.5 text-brand/70 transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestions([]);
            setStatus("loading");
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (query.trim().length >= 1 && status === "idle") setStatus("loading");
          }}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ""}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-label="Location"
          className="h-6 min-w-[110px] flex-1 border-0 bg-transparent p-0 text-[13px] text-foreground outline-none placeholder:text-muted/70 focus-visible:outline-none!"
        />

        {showPanel && status === "loading" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />
        )}
        {query && (
          <button
            type="button"
            aria-label="Clear city search"
            title="Clear city search"
            onClick={(event) => {
              event.stopPropagation();
              clearQuery();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
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
            aria-label="City suggestions"
            className="max-h-64 overflow-y-auto py-1"
          >
            {displayStatus === "loading" && (
              <div role="status" aria-live="polite" className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding cities…
              </div>
            )}

            {displayStatus === "empty" && (
              <div role="status" aria-live="polite" className="px-3 py-2.5 text-[11px] text-muted">
                {allMatchesSelected ? "All matching cities are already selected." : "No matching cities found."}
              </div>
            )}

            {displayStatus === "error" && (
              <div role="alert" className="flex items-start gap-2 px-3 py-2.5 text-[11px] text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Couldn’t load cities. Please try again.
              </div>
            )}

            {displayStatus === "ready" &&
              availableSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectSuggestion(suggestion);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                    index === activeSuggestionIndex ? "bg-brand-soft" : "hover:bg-surface-muted",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  <span className="truncate text-[11.5px] font-medium text-foreground">
                    {suggestion.label}
                  </span>
                </button>
              ))}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-[9px] text-muted">
            City data © OpenStreetMap contributors · © GeoNames
          </div>
        </div>
      )}
    </div>
  );
}
