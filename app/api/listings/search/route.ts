import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { searchAllProviders } from "@/lib/providers";

const searchSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number(),
  minBedrooms: z.coerce.number().optional(),
  petFriendly: z.coerce.boolean().optional(),
});

/**
 * Ad-hoc search used by the homepage search form — fetches fresh from
 * providers, upserts into Listing so the results have stable IDs to link
 * to (/listings/[id]), and returns the persisted rows. This is the same
 * upsert path the matching cron uses, so a listing found here and later
 * matched to a saved profile is the same DB row.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const criteria = parsed.data;

  const found = await searchAllProviders({ ...criteria, limit: 30 });

  const listings = await Promise.all(
    found.map((normalized) =>
      prisma.listing.upsert({
        where: { source_externalId: { source: normalized.source, externalId: normalized.externalId } },
        create: { ...normalized, raw: normalized.raw as object | undefined },
        update: {
          price: normalized.price,
          amenities: normalized.amenities,
          availableFrom: normalized.availableFrom,
          rating: normalized.rating,
          reviewCount: normalized.reviewCount,
          fetchedAt: new Date(),
        },
      })
    )
  );

  return NextResponse.json({ listings });
}
