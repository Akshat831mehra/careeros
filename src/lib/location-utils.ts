export function normalizeCityNames(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const city = value.replace(/\s+/g, " ").trim();
    if (!city) continue;

    const key = city.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    cities.push(city);
  }

  return cities;
}

export function savedSearchLocations(search: {
  locations?: string[] | null;
  location?: string | null;
}): string[] {
  if (search.locations?.length) return normalizeCityNames(search.locations);
  if (search.location) return normalizeCityNames([search.location]);
  return [];
}
