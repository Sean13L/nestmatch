import type { ListingProvider, NormalizedListing, SearchCriteria } from "./types";
import { envInt, getCachedResponse, isFresh, reserveMonthlyRequest, setCachedResponse } from "./cache";

/**
 * RentCast (https://www.rentcast.io/api) — a licensed rental listing API,
 * US-only. Adding coverage elsewhere means adding another ListingProvider
 * (see lib/providers/README.md), not widening this one.
 *
 * RentCast's free tier has a small monthly request quota, so every call goes
 * through a DB cache (RENTCAST_CACHE_HOURS) and a monthly budget
 * (RENTCAST_MONTHLY_REQUEST_LIMIT). The cache key only contains the params
 * RentCast itself filters on; price/bedroom/pet filters run locally, so
 * different budgets in the same city share one API call.
 *
 * Field names in `normalize()` follow RentCast's documented long-term rental
 * listing shape; nothing else in the app depends on RentCast's raw format.
 */

const BASE_URL = "https://api.rentcast.io/v1";
const PROVIDER = "rentcast";
const FETCH_LIMIT = 100;
const KM_PER_MILE = 1.609344;
const US_ALIASES = new Set(["us", "usa", "united states", "united states of america"]);

interface RentCastListing {
  id: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  status?: string;
  listedDate?: string;
  availableDate?: string;
  photos?: string[];
  features?: Record<string, unknown> | null;
}

function toAmenities(features: RentCastListing["features"]): string[] {
  if (!features) return [];
  const amenities: string[] = [];
  if (features["garage"]) amenities.push("parking");
  if (features["pool"]) amenities.push("pool");
  if (features["fireplace"]) amenities.push("fireplace");
  if (features["laundryFeatures"]) amenities.push("in_unit_laundry");
  return amenities;
}

function normalize(item: RentCastListing): NormalizedListing | null {
  if (!item.id || !item.price || item.price <= 0) return null;
  return {
    source: PROVIDER,
    externalId: item.id,
    title: item.formattedAddress ?? item.addressLine1 ?? "Rental listing",
    url: `https://www.rentcast.io/listing/${item.id}`,
    addressLine: item.addressLine1,
    city: item.city,
    region: item.state,
    country: "US",
    postalCode: item.zipCode,
    lat: item.latitude,
    lng: item.longitude,
    price: item.price,
    currency: "USD",
    priceInterval: "month",
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    amenities: toAmenities(item.features),
    petFriendly: Boolean(item.features?.["petsAllowed"]),
    availableFrom: item.availableDate ? new Date(item.availableDate) : undefined,
    images: item.photos ?? [],
    raw: item,
  };
}

/** Returns null when the criteria don't pin down a location worth a paid call. */
function buildQuery(criteria: SearchCriteria): URLSearchParams | null {
  const params = new URLSearchParams();
  if (criteria.lat != null && criteria.lng != null) {
    params.set("latitude", String(criteria.lat));
    params.set("longitude", String(criteria.lng));
    params.set("radius", ((criteria.radiusKm ?? 10) / KM_PER_MILE).toFixed(1));
  } else if (criteria.city?.trim()) {
    params.set("city", criteria.city.trim());
    if (criteria.region?.trim()) params.set("state", criteria.region.trim());
  } else {
    return null;
  }
  params.set("status", "Active");
  params.set("limit", String(FETCH_LIMIT));
  params.sort();
  return params;
}

async function loadListings(apiKey: string, query: URLSearchParams): Promise<RentCastListing[]> {
  const queryKey = query.toString();
  const cached = await getCachedResponse<RentCastListing[]>(PROVIDER, queryKey);
  if (cached && isFresh(cached.fetchedAt, envInt("RENTCAST_CACHE_HOURS", 12) * 60 * 60 * 1000)) {
    return cached.data;
  }

  const limit = envInt("RENTCAST_MONTHLY_REQUEST_LIMIT", 45);
  if (!(await reserveMonthlyRequest(PROVIDER, limit))) {
    console.warn(`RentCast monthly request budget (${limit}) used up; serving ${cached ? "stale cache" : "no results"}.`);
    return cached?.data ?? [];
  }

  const res = await fetch(`${BASE_URL}/listings/rental/long-term?${queryKey}`, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`RentCast search failed: ${res.status} ${await res.text()}`);
    return cached?.data ?? [];
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    console.error("RentCast returned a non-array response:", data);
    return cached?.data ?? [];
  }
  await setCachedResponse(PROVIDER, queryKey, data);
  return data as RentCastListing[];
}

export const rentcastProvider: ListingProvider = {
  key: PROVIDER,
  label: "RentCast (US)",
  isConfigured: () => Boolean(process.env.RENTCAST_API_KEY),
  async search(criteria: SearchCriteria): Promise<NormalizedListing[]> {
    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey || !US_ALIASES.has(criteria.country.trim().toLowerCase())) return [];

    const query = buildQuery(criteria);
    if (!query) return [];

    const minPrice = criteria.minPrice ?? 0;
    return (await loadListings(apiKey, query))
      .map(normalize)
      .filter((listing): listing is NormalizedListing => {
        if (!listing) return false;
        if (listing.price < minPrice || listing.price > criteria.maxPrice) return false;
        if (criteria.minBedrooms != null && (listing.bedrooms ?? 0) < criteria.minBedrooms) return false;
        if (criteria.minBathrooms != null && (listing.bathrooms ?? 0) < criteria.minBathrooms) return false;
        if (criteria.petFriendly && !listing.petFriendly) return false;
        return true;
      })
      .slice(0, criteria.limit ?? FETCH_LIMIT);
  },
};
