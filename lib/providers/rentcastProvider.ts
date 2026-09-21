import type { ListingProvider, NormalizedListing, SearchCriteria } from "./types";

/**
 * RentCast (https://www.rentcast.io/api) — a legitimate, licensed rental
 * listing API with a metered free tier, covering the US market. This is the
 * first "real" provider so the MVP has at least one non-mock data source;
 * it is intentionally US-only for now. Adding coverage elsewhere means
 * adding another file implementing ListingProvider (e.g. a UK adapter
 * against Zoopla's partner API, an AU adapter against Domain's API) and
 * registering it in ./index.ts — see lib/providers/README.md.
 *
 * Field names below follow RentCast's documented "long-term rental
 * listings" response shape as of integration time; if their API evolves,
 * update the mapping in `normalize()` only — nothing else in the app
 * depends on RentCast's raw shape.
 */

const BASE_URL = "https://api.rentcast.io/v1";

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
  squareFootage?: number;
  propertyType?: string;
  listingType?: string;
  status?: string;
  listedDate?: string;
  availableDate?: string;
  daysOnMarket?: number;
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

function normalize(item: RentCastListing, fallbackCountry: string): NormalizedListing | null {
  if (!item.price || item.price <= 0) return null;
  return {
    source: "rentcast",
    externalId: item.id,
    title: item.formattedAddress ?? item.addressLine1 ?? "Rental listing",
    url: `https://www.rentcast.io/listing/${item.id}`,
    addressLine: item.addressLine1,
    city: item.city,
    region: item.state,
    country: fallbackCountry || "US",
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

export const rentcastProvider: ListingProvider = {
  key: "rentcast",
  label: "RentCast (US)",
  isConfigured: () => Boolean(process.env.RENTCAST_API_KEY),
  async search(criteria: SearchCriteria): Promise<NormalizedListing[]> {
    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams();
    if (criteria.city) params.set("city", criteria.city);
    if (criteria.region) params.set("state", criteria.region);
    if (criteria.lat != null && criteria.lng != null) {
      params.set("latitude", String(criteria.lat));
      params.set("longitude", String(criteria.lng));
      params.set("radius", String(criteria.radiusKm ?? 10));
    }
    if (criteria.minBedrooms != null) params.set("bedrooms", String(criteria.minBedrooms));
    params.set("status", "Active");
    params.set("limit", String(Math.min(criteria.limit ?? 20, 50)));

    const res = await fetch(`${BASE_URL}/listings/rental/long-term?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      // Listing data changes over hours, not seconds — cache briefly to
      // stay well inside the free-tier request quota.
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.error(`RentCast search failed: ${res.status} ${await res.text()}`);
      return [];
    }

    const data = (await res.json()) as RentCastListing[];
    const maxPrice = criteria.maxPrice;
    const minPrice = criteria.minPrice ?? 0;

    return data
      .map((item) => normalize(item, criteria.country))
      .filter((listing): listing is NormalizedListing => {
        if (!listing) return false;
        if (listing.price < minPrice || listing.price > maxPrice) return false;
        if (criteria.petFriendly && !listing.petFriendly) return false;
        return true;
      });
  },
};
