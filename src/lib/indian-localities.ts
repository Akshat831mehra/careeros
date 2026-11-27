import localities from "@/data/indian-localities.json";

export type LocalitySuggestion = {
  id: string;
  label: string;
  name: string;
  city: string;
  state: string;
  country: string;
  context: string;
  kind: "City";
};

// Generated from the GeoNames India country file (Creative Commons Attribution 4.0).
// It contains every Indian populated place above the configured population floor,
// plus all administrative seats and urban localities — not a hand-picked city list.
const entries = localities as Array<[string, number]>;

export function searchIndianLocalities(query: string, limit: number): LocalitySuggestion[] {
  const prefix = query.trim().toLowerCase();
  if (!prefix) return [];

  const matches: Array<{ suggestion: LocalitySuggestion; population: number }> = [];
  for (const [name, population] of entries) {
    if (!name.toLowerCase().startsWith(prefix)) continue;
    matches.push({
      population,
      suggestion: {
        id: `geonames-${name.toLowerCase()}`,
        label: name,
        name,
        city: name,
        state: "",
        country: "India",
        context: "",
        kind: "City",
      },
    });
  }

  // Larger places first so common prefixes surface well-known cities.
  return matches
    .sort((a, b) => b.population - a.population || a.suggestion.name.localeCompare(b.suggestion.name))
    .slice(0, limit)
    .map((match) => match.suggestion);
}
