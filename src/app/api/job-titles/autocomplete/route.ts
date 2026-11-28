import { NextResponse } from "next/server";
import { readJobTitleCache, writeJobTitleCache } from "@/lib/job-title-cache";
import {
  normalizeJobTitle,
  sanitizeJobTitle,
  tokenizeJobTitle,
  type JobTitleOption,
} from "@/lib/job-title-utils";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const MAX_QUERY_LENGTH = 120;
const MAX_SUGGESTIONS = 8;
const DB_SCAN_LIMIT = 80;
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=1800",
};

type RankedTitle = {
  id: string;
  title: string;
  normalizedTitle: string;
  category: string | null;
  popularity: number;
  usageCount: number;
};

function rankSuggestion(row: RankedTitle, normalizedQuery: string, firstToken: string) {
  let score = row.popularity;
  score += Math.min(row.usageCount, 50) * 2;

  const title = row.normalizedTitle;
  if (title === normalizedQuery) score += 1000;
  else if (title.startsWith(normalizedQuery)) score += 500;
  else if (title.includes(normalizedQuery)) score += 200;

  if (firstToken && title.split(" ").some((word) => word.startsWith(firstToken))) {
    score += 80;
  }

  return score;
}

export async function GET(request: Request) {
  if (!(await getSessionUserId())) {
    return NextResponse.json({ error: "Unauthorized", suggestions: [] }, { status: 401 });
  }

  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = sanitizeJobTitle(rawQuery, MAX_QUERY_LENGTH);
  const tokens = tokenizeJobTitle(query);
  if (!tokens.length) return NextResponse.json({ suggestions: [] });

  const cacheKey = `job-title-v1:${tokens.join(" ")}`;
  const cached = readJobTitleCache(cacheKey);
  if (cached) {
    return NextResponse.json(
      { suggestions: cached, cached: true },
      { headers: CACHE_HEADERS },
    );
  }

  const rows = (await prisma.jobTitleSuggestion.findMany({
    where: {
      AND: tokens.map((token) => ({ normalizedTitle: { contains: token } })),
    },
    select: {
      id: true,
      title: true,
      normalizedTitle: true,
      category: true,
      popularity: true,
      usageCount: true,
    },
    orderBy: [{ usageCount: "desc" }, { popularity: "desc" }, { title: "asc" }],
    take: DB_SCAN_LIMIT,
  })) as RankedTitle[];

  const normalizedQuery = normalizeJobTitle(query);
  const firstToken = tokens[0] ?? "";

  const suggestions: JobTitleOption[] = rows
    .sort(
      (a, b) =>
        rankSuggestion(b, normalizedQuery, firstToken) -
          rankSuggestion(a, normalizedQuery, firstToken) ||
        a.title.length - b.title.length ||
        a.title.localeCompare(b.title),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((row) => ({
      id: row.id,
      label: row.title,
      title: row.title,
      category: row.category,
      kind: "Role",
    }));

  // Never cache an empty result: a newly saved custom role should be visible
  // immediately on the next request.
  if (suggestions.length > 0) writeJobTitleCache(cacheKey, suggestions);

  return NextResponse.json(
    { suggestions },
    { headers: CACHE_HEADERS },
  );
}
