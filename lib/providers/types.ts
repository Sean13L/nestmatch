/**
 * A ListingProvider wraps one legitimate data source (an official API or a
 * partner feed — never a scrape of a site whose ToS prohibits it; see
 * README.md "Data sourcing"). Adding a new region/source means implementing
 * this interface and registering it in ./index.ts — nothing else in the app
 * needs to change, which is how "global" coverage grows incrementally as
 * more provider partnerships/keys are added.
 */

export interface SearchCriteria {
  city?: string;
  region?: string;
  country: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice: number;
  currency?: string;
  minBedrooms?: number;
  minBathrooms?: number;
  moveInEarliest?: Date;
  moveInLatest?: Date;
  amenities?: string[];
  petFriendly?: boolean;
  limit?: number;
}

export interface NormalizedListing {
  source: string;
  externalId: string;
  title: string;
  description?: string;
  url: string;

  addressLine?: string;
  city?: string;
  region?: string;
  country: string;
  postalCode?: string;
  lat?: number;
  lng?: number;

  price: number;
  currency: string;
  priceInterval: "month" | "week" | "night";

  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];

  petFriendly: boolean;
  availableFrom?: Date;
  images: string[];

  rating?: number;
  reviewCount?: number;

  raw?: unknown;
}

export interface ListingProvider {
  /** Machine-readable key, matches Listing.source in the DB. */
  key: string;
  /** Human-readable label for provider-attribution UI (data source, ToS). */
  label: string;
  /** True when this adapter has real credentials configured. */
  isConfigured(): boolean;
  search(criteria: SearchCriteria): Promise<NormalizedListing[]>;
}
