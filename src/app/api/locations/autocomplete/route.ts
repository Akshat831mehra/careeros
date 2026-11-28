import { NextResponse } from "next/server";
import { searchIndianLocalities } from "@/lib/indian-localities";
import { getSessionUserId } from "@/lib/session";

type LocationSuggestion = {
  id: string;
  label: string;
  name: string;
  city: string;
  state: string;
  country: string;
  context: string;
  kind: "City";
};

type CachedSuggestions = {
  suggestions: LocationSuggestion[];
  expiresAt: number;
};

const PHOTON_URL = process.env.LOCATION_AUTOCOMPLETE_URL ?? "https://photon.komoot.io/api/";
const NOMINATIM_URL =
  process.env.LOCATION_FALLBACK_URL ?? "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.LOCATION_USER_AGENT ?? "CareerOS/1.0 (OpenStreetMap city autocomplete)";
const COUNTRY_CODE = "in";
const COUNTRY_NAME = "India";
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const PROVIDER_LIMIT = 30;
const MAX_SUGGESTIONS = 8;
const CITY_TYPES = new Set(["city", "town", "village", "municipality"]);
const EXCLUDED_PROVIDER_KEYS = new Set([
  "aeroway",
  "amenity",
  "highway",
  "office",
  "railway",
  "shop",
  "tourism",
]);

const cache = new Map<string, CachedSuggestions>();

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function unique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = clean(value).toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(clean(value));
  }
  return result;
}

function buildContext(city: string, values: Array<string | null | undefined>) {
  return unique(values)
    .filter((part) => part.toLowerCase() !== city.toLowerCase())
    .slice(0, 4)
    .join(" · ");
}

function isIndianLocation(values: Array<string | null | undefined>) {
  return values.some((value) => {
    const normalized = clean(value).toLowerCase();
    return normalized === COUNTRY_NAME.toLowerCase() || normalized === COUNTRY_CODE;
  });
}

function isPhotonCity(properties: Record<string, unknown>) {
  const key = clean(properties.osm_key).toLowerCase();
  const value = clean(properties.osm_value).toLowerCase();
  const type = clean(properties.type).toLowerCase();

  return (
    (key === "place" && CITY_TYPES.has(value)) ||
    (key === "boundary" && value === "administrative" && CITY_TYPES.has(type))
  );
}

function fromPhoton(feature: unknown): LocationSuggestion | null {
  const item = feature as { properties?: Record<string, unknown> };
  const properties = item.properties ?? {};
  if (EXCLUDED_PROVIDER_KEYS.has(clean(properties.osm_key).toLowerCase())) return null;
  if (!isPhotonCity(properties)) return null;

  const city =
    clean(properties.name) ||
    clean(properties.city) ||
    clean(properties.town) ||
    clean(properties.village);
  if (!city) return null;

  const state = clean(properties.state);
  const country = clean(properties.country);
  if (!isIndianLocation([country, clean(properties.countrycode)])) return null;
  const osmType = clean(properties.osm_type) || "photon";
  const osmId = String(properties.osm_id ?? city);

  return {
    id: `${osmType}-${osmId}`,
    label: city,
    name: city,
    city,
    state,
    country,
    context: buildContext(city, [
      clean(properties.county),
      clean(properties.district),
      clean(properties.city),
      state,
      country,
    ]),
    kind: "City",
  };
}

function isNominatimCity(item: {
  addresstype?: string;
  category?: string;
  type?: string;
}) {
  const addressType = clean(item.addresstype).toLowerCase();
  const category = clean(item.category).toLowerCase();
  const type = clean(item.type).toLowerCase();

  return CITY_TYPES.has(addressType) || (category === "place" && CITY_TYPES.has(type));
}

function fromNominatim(result: unknown): LocationSuggestion | null {
  const item = result as {
    place_id?: number;
    osm_type?: string;
    osm_id?: number;
    addresstype?: string;
    category?: string;
    type?: string;
    display_name?: string;
    address?: Record<string, unknown>;
  };
  if (EXCLUDED_PROVIDER_KEYS.has(clean(item.category).toLowerCase())) return null;
  if (!isNominatimCity(item)) return null;

  const address = item.address ?? {};
  const city =
    clean(address.city) ||
    clean(address.town) ||
    clean(address.village) ||
    clean(item.display_name).split(",")[0];
  if (!city) return null;

  const state = clean(address.state) || clean(address.region);
  const country = clean(address.country);
  if (!isIndianLocation([country, clean(address.country_code)])) return null;

  return {
    id: `${item.osm_type ?? "nominatim"}-${item.osm_id ?? item.place_id ?? city}`,
    label: city,
    name: city,
    city,
    state,
    country,
    context: buildContext(city, [
      clean(address.county),
      clean(address.city_district),
      clean(address.suburb),
      clean(address.postcode),
      state,
      country,
    ]),
    kind: "City",
  };
}

function dedupe(suggestions: LocationSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = suggestion.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyPrefixFilter(suggestions: LocationSuggestion[], query: string) {
  const prefix = query.trim().toLowerCase();
  if (!prefix) return [];
  return suggestions.filter((suggestion) => suggestion.label.toLowerCase().startsWith(prefix));
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Location provider returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function photonRank(feature: unknown) {
  const properties = (feature as { properties?: Record<string, unknown> }).properties ?? {};
  if (clean(properties.osm_key).toLowerCase() !== "place") return 0;
  const value = clean(properties.osm_value).toLowerCase();
  if (value === "city") return 3;
  if (value === "town") return 2;
  if (value === "municipality") return 1;
  if (value === "village") return 0.5;
  return 0;
}

function nominatimRank(result: unknown) {
  const item = result as { addresstype?: string };
  const value = clean(item.addresstype).toLowerCase();
  if (value === "city") return 3;
  if (value === "town") return 2;
  if (value === "municipality") return 1;
  if (value === "village") return 0.5;
  return 0;
}

async function searchPhoton(query: string) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(PROVIDER_LIMIT));
  url.searchParams.set("lang", "en");
  url.searchParams.set("countrycode", COUNTRY_CODE);

  const data = (await fetchJson(url.toString())) as { features?: unknown[] };
  const ranked = [...(data.features ?? [])].sort((a, b) => photonRank(b) - photonRank(a));
  return dedupe(ranked.map(fromPhoton).filter(Boolean) as LocationSuggestion[]);
}

async function searchNominatim(query: string) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", COUNTRY_CODE);
  url.searchParams.set("limit", String(PROVIDER_LIMIT));

  const data = (await fetchJson(url.toString())) as unknown[];
  const ranked = [...data].sort((a, b) => nominatimRank(b) - nominatimRank(a));
  return dedupe(ranked.map(fromNominatim).filter(Boolean) as LocationSuggestion[]);
}

function readCache(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.suggestions;
}

function writeCache(key: string, suggestions: LocationSuggestion[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { suggestions, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: Request) {
  if (!(await getSessionUserId())) {
    return NextResponse.json({ error: "Unauthorized", suggestions: [] }, { status: 401 });
  }

  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = rawQuery.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = `city-india-prefix-v1:${query.toLowerCase()}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json(
      { suggestions: cached, cached: true },
      { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=1800" } },
    );
  }

  // The local India dataset is the baseline: it is comprehensive, instant, and
  // works even when the public Photon instance is throttled or unavailable.
  const localSuggestions = searchIndianLocalities(query, MAX_SUGGESTIONS);
  let suggestions = localSuggestions as LocationSuggestion[];

  if (suggestions.length < MAX_SUGGESTIONS) {
    let providerSuggestions: LocationSuggestion[] = [];
    try {
      providerSuggestions = applyPrefixFilter(await searchPhoton(query), query);
    } catch (error) {
      console.error("Photon city lookup failed", error);
    }

    if (!providerSuggestions.length) {
      try {
        providerSuggestions = applyPrefixFilter(await searchNominatim(query), query);
      } catch (error) {
        console.error("Nominatim city lookup failed", error);
        if (!suggestions.length) {
          return NextResponse.json(
            { error: "City suggestions are unavailable right now.", suggestions: [] },
            { status: 502 },
          );
        }
      }
    }

    suggestions = dedupe([...providerSuggestions, ...suggestions]);
  }

  suggestions = suggestions.slice(0, MAX_SUGGESTIONS);

  // Never cache an empty result: a transient provider outage would otherwise
  // suppress valid city suggestions for the whole cache window.
  if (suggestions.length > 0) writeCache(cacheKey, suggestions);
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=1800" } },
  );
}
