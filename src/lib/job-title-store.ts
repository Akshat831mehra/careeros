import { clearJobTitleCache } from "@/lib/job-title-cache";
import { normalizeJobTitle, sanitizeJobTitle } from "@/lib/job-title-utils";
import { prisma } from "@/lib/prisma";

/**
 * Records the role used by a saved search so it becomes a suggestion for the
 * next search. Failures must never block saving the search itself.
 */
export async function recordJobTitleUsage(value: string) {
  const title = sanitizeJobTitle(value);
  const normalizedTitle = normalizeJobTitle(title);
  if (!title || !normalizedTitle) return;

  try {
    await prisma.jobTitleSuggestion.upsert({
      where: { normalizedTitle },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        title,
        normalizedTitle,
        category: "Saved searches",
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });
    clearJobTitleCache();
  } catch (error) {
    console.error("Could not record job title usage", error);
  }
}
