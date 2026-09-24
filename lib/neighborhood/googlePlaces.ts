import { envInt, getCachedResponse, isFresh, reserveMonthlyRequest, setCachedResponse } from "@/lib/providers/cache";

/**
 * "Fitness, student life, surrounding community, local food and
 * recreation" — one Places API (New) Nearby Search per category, cached per
 * ~110m grid cell for 14 days and capped by GOOGLE_PLACES_MONTHLY_REQUEST_LIMIT.
 * Without GOOGLE_PLACES_API_KEY this returns {} and the listing page hides
 * the section.
 *
 * The field mask is deliberately limited to name + short address: asking
 * for rating/userRatingCount moves every call to Google's pricier Nearby
 * Search SKU tier.
 */

const PROVIDER = "google_places";
const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const FIELD_MASK = "places.displayName,places.shortFormattedAddress";
const CACHE_MS = 14 * 24 * 60 * 60 * 1000;

export interface NeighborhoodCategory {
  key: string;
  label: string;
  includedTypes: string[];
  radiusMeters: number;
}

export const NEIGHBORHOOD_CATEGORIES: NeighborhoodCategory[] = [
  { key: "fitness", label: "Fitness", includedTypes: ["gym"], radiusMeters: 2000 },
  { key: "student_life", label: "Student life", includedTypes: ["university"], radiusMeters: 5000 },
  { key: "food", label: "Local food", includedTypes: ["restaurant", "cafe"], radiusMeters: 1200 },
  { key: "recreation", label: "Recreation", includedTypes: ["park"], radiusMeters: 2000 },
  { key: "community", label: "Community & errands", includedTypes: ["grocery_store", "supermarket"], radiusMeters: 1500 },
];

export interface NeighborhoodPlace {
  name: string;
  address?: string;
}

export type NeighborhoodInsights = Record<string, NeighborhoodPlace[]>;

interface SearchNearbyResponse {
  places?: { displayName?: { text?: string }; shortFormattedAddress?: string }[];
}

async function fetchCategory(
  apiKey: string,
  lat: number,
  lng: number,
  category: NeighborhoodCategory
): Promise<NeighborhoodPlace[]> {
  const queryKey = `${lat},${lng}:${category.key}`;
  const cached = await getCachedResponse<NeighborhoodPlace[]>(PROVIDER, queryKey);
  if (cached && isFresh(cached.fetchedAt, CACHE_MS)) return cached.data;

  const limit = envInt("GOOGLE_PLACES_MONTHLY_REQUEST_LIMIT", 4500);
  if (!(await reserveMonthlyRequest(PROVIDER, limit))) {
    console.warn(`Google Places monthly request budget (${limit}) used up.`);
    return cached?.data ?? [];
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: category.includedTypes,
        maxResultCount: 6,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: category.radiusMeters },
        },
      }),
      cache: "no-store",
    });
  } catch (err) {
    // A network failure must not take down the listing page that rendered us.
    console.error(`Google Places request failed for ${category.key}:`, err);
    return cached?.data ?? [];
  }
  if (!res.ok) {
    console.error(`Google Places lookup failed for ${category.key}: ${res.status} ${await res.text()}`);
    return cached?.data ?? [];
  }

  const json: SearchNearbyResponse = await res.json();
  const places: NeighborhoodPlace[] = (json.places ?? []).flatMap((p) =>
    p.displayName?.text ? [{ name: p.displayName.text, address: p.shortFormattedAddress }] : []
  );
  await setCachedResponse(PROVIDER, queryKey, places);
  return places;
}

export async function getNeighborhoodInsights(lat: number, lng: number): Promise<NeighborhoodInsights> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};

  // Snap to a ~110m grid so nearby listings share both the query and the cache entry.
  const cellLat = Math.round(lat * 1000) / 1000;
  const cellLng = Math.round(lng * 1000) / 1000;

  const entries = await Promise.all(
    NEIGHBORHOOD_CATEGORIES.map(
      async (category) => [category.key, await fetchCategory(apiKey, cellLat, cellLng, category)] as const
    )
  );
  return Object.fromEntries(entries);
}
