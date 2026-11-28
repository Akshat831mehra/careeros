import type { JobTitleOption } from "@/lib/job-title-utils";

type CachedSuggestions = {
  suggestions: JobTitleOption[];
  expiresAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const cache = new Map<string, CachedSuggestions>();

export function readJobTitleCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.suggestions;
}

export function writeJobTitleCache(key: string, suggestions: JobTitleOption[]) {
  cache.set(key, {
    suggestions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export function clearJobTitleCache() {
  cache.clear();
}
