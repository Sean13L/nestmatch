import { prisma } from "@/lib/prisma";

/**
 * "Fitness, student life, surrounding community, local food and
 * recreation" — implemented as nearby-places lookups against the Google
 * Places API (Nearby Search), one category at a time, cached in
 * NeighborhoodCache so a listing page doesn't re-hit the API on every view.
 * Requires GOOGLE_PLACES_API_KEY; when unset, callers get an empty result
 * and the UI simply omits the section rather than erroring.
 */

export interface NeighborhoodCategory {
  key: string;
  label: string;
  googleType: string;
  radiusMeters: number;
}

export const NEIGHBORHOOD_CATEGORIES: NeighborhoodCategory[] = [
  { key: "fitness", label: "Fitness", googleType: "gym", radiusMeters: 2000 },
  { key: "student_life", label: "Student life", googleType: "university", radiusMeters: 5000 },
  { key: "food", label: "Local food", googleType: "restaurant", radiusMeters: 1200 },
  { key: "recreation", label: "Recreation", googleType: "park", radiusMeters: 2000 },
  { key: "community", label: "Community & errands", googleType: "grocery_or_supermarket", radiusMeters: 1500 },
];

export interface NeighborhoodPlace {
  name: string;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
}

export type NeighborhoodInsights = Record<string, NeighborhoodPlace[]>;

// Round to ~110m grid cells so nearby listings share a cache entry.
function cacheKey(lat: number, lng: number) {
  return { latKey: Math.round(lat * 1000) / 1000, lngKey: Math.round(lng * 1000) / 1000 };
}

async function fetchCategory(lat: number, lng: number, category: NeighborhoodCategory): Promise<NeighborhoodPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const { latKey, lngKey } = cacheKey(lat, lng);
  const cached = await prisma.neighborhoodCache.findUnique({
    where: { latKey_lngKey_category: { latKey, lngKey, category: category.key } },
  });
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.fetchedAt.getTime() < 14 * ONE_DAY) {
    return cached.data as unknown as NeighborhoodPlace[];
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(category.radiusMeters));
  url.searchParams.set("type", category.googleType);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`Google Places lookup failed for ${category.key}: ${res.status}`);
    return cached ? (cached.data as unknown as NeighborhoodPlace[]) : [];
  }

  interface GooglePlacesResult {
    name: string;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
  }
  const json: { results?: GooglePlacesResult[] } = await res.json();
  const places: NeighborhoodPlace[] = (json.results ?? []).slice(0, 6).map((r) => ({
    name: r.name,
    vicinity: r.vicinity,
    rating: r.rating,
    userRatingsTotal: r.user_ratings_total,
  }));

  await prisma.neighborhoodCache.upsert({
    where: { latKey_lngKey_category: { latKey, lngKey, category: category.key } },
    create: { latKey, lngKey, category: category.key, data: places as unknown as object },
    update: { data: places as unknown as object, fetchedAt: new Date() },
  });

  return places;
}

export async function getNeighborhoodInsights(lat: number, lng: number): Promise<NeighborhoodInsights> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return {};

  const entries = await Promise.all(
    NEIGHBORHOOD_CATEGORIES.map(async (category) => [category.key, await fetchCategory(lat, lng, category)] as const)
  );
  return Object.fromEntries(entries);
}
