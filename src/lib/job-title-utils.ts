export const MAX_JOB_TITLE_LENGTH = 160;

export type JobTitleOption = {
  id: string;
  label: string;
  title: string;
  category: string | null;
  kind: "Role";
};

/**
 * Removes control characters and collapses whitespace so titles can be
 * compared and persisted safely.
 */
export function sanitizeJobTitle(value: string, maxLength = MAX_JOB_TITLE_LENGTH) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeJobTitle(value: string) {
  return sanitizeJobTitle(value).toLowerCase();
}

/**
 * Splits a title into searchable tokens. Symbols commonly used in role names
 * (C++, .NET, C#) are kept as part of a token.
 */
export function tokenizeJobTitle(value: string, maxTokens = 8) {
  const tokens = normalizeJobTitle(value).match(/[a-z0-9+#.]+/g) ?? [];
  return Array.from(new Set(tokens)).slice(0, maxTokens);
}
