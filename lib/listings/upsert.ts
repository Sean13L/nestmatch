import type { Listing, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedListing } from "@/lib/providers";

// Optional fields become null rather than undefined so a re-fetch clears
// values the provider stopped returning (Prisma skips undefined on update).
function toListingData(n: NormalizedListing) {
  return {
    title: n.title,
    description: n.description ?? null,
    url: n.url,
    addressLine: n.addressLine ?? null,
    city: n.city ?? null,
    region: n.region ?? null,
    country: n.country,
    postalCode: n.postalCode ?? null,
    lat: n.lat ?? null,
    lng: n.lng ?? null,
    price: n.price,
    currency: n.currency,
    priceInterval: n.priceInterval,
    bedrooms: n.bedrooms ?? null,
    bathrooms: n.bathrooms ?? null,
    amenities: n.amenities,
    petFriendly: n.petFriendly,
    availableFrom: n.availableFrom ?? null,
    images: n.images,
    rating: n.rating ?? null,
    reviewCount: n.reviewCount ?? null,
    raw: n.raw == null ? undefined : (n.raw as Prisma.InputJsonValue),
  };
}

/** Upserts provider results by (source, externalId), refreshing every field on re-fetch. */
export function upsertListings(found: NormalizedListing[]): Promise<Listing[]> {
  return Promise.all(
    found.map((n) => {
      const data = toListingData(n);
      return prisma.listing.upsert({
        where: { source_externalId: { source: n.source, externalId: n.externalId } },
        create: { source: n.source, externalId: n.externalId, ...data },
        update: { ...data, fetchedAt: new Date() },
      });
    })
  );
}
