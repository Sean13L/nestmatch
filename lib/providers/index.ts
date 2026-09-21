import type { ListingProvider, SearchCriteria, NormalizedListing } from "./types";
import { mockProvider } from "./mockProvider";
import { rentcastProvider } from "./rentcastProvider";

/**
 * All registered providers. To add coverage for a new region/source:
 *   1. Implement ListingProvider in a new file (see rentcastProvider.ts).
 *   2. Add it to this array.
 * Only providers that return true from isConfigured() are queried; if none
 * are configured, the mock provider (always "configured") fills in so the
 * app still functions end to end.
 */
const REGISTRY: ListingProvider[] = [rentcastProvider, mockProvider];

export function getConfiguredProviders(): ListingProvider[] {
  const real = REGISTRY.filter((p) => p.key !== "mock" && p.isConfigured());
  return real.length > 0 ? real : [mockProvider];
}

export async function searchAllProviders(criteria: SearchCriteria): Promise<NormalizedListing[]> {
  const providers = getConfiguredProviders();
  const results = await Promise.allSettled(providers.map((p) => p.search(criteria)));
  const listings: NormalizedListing[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      listings.push(...result.value);
    } else {
      console.error(`Provider "${providers[i].key}" search failed:`, result.reason);
    }
  });
  return listings;
}

export type { ListingProvider, SearchCriteria, NormalizedListing };
