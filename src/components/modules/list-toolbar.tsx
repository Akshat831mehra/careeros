"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraft } from "@/lib/use-draft";

export type FilterDefinition = {
  key: string;
  label: string;
  allLabel?: string;
  options: { value: string; label: string }[];
};

export function ListToolbar({
  searchPlaceholder = "Search…",
  filters = [],
  count,
  countLabel = "records",
  children,
}: {
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  count?: number;
  countLabel?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("q") ?? "";
  const { value: search, setValue: setSearch, clearDraft: clearSearchDraft } = useDraft<string>(
    `list-search:${pathname}`,
    paramSearch,
  );
  const lastParamSearch = React.useRef(paramSearch);

  React.useEffect(() => {
    if (paramSearch === lastParamSearch.current) return;
    lastParamSearch.current = paramSearch;
    if (paramSearch !== search) setSearch(paramSearch);
  }, [paramSearch, search, setSearch]);

  const updateParam = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key) ?? "";
      if (value && value !== "all" && value !== current) params.set(key, value);
      else if (!value || value === "all") {
        if (!current) return;
        params.delete(key);
      } else return;

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (search === (searchParams.get("q") ?? "")) return;
    const timeout = setTimeout(() => updateParam("q", search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search, searchParams, updateParam]);

  const hasFilters = Boolean(searchParams.toString());

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8 pr-8 text-[12.5px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => void clearSearchDraft("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const value = searchParams.get(filter.key) ?? "all";
            return (
              <Select key={filter.key} value={value} onValueChange={(next) => updateParam(filter.key, next)}>
                <SelectTrigger className="h-9 w-auto min-w-[130px] text-[12px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{filter.allLabel ?? `All ${filter.label.toLowerCase()}`}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px]"
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {typeof count === "number" && (
            <span className="whitespace-nowrap text-[10.5px] tabular-nums text-muted">
              {count} {countLabel}
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
