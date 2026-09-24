import { prisma } from "@/lib/prisma";
import { searchAllProviders } from "@/lib/providers";
import { upsertListings } from "@/lib/listings/upsert";
import { sendMatchNotification } from "@/lib/notifications/email";
import { scoreListing } from "./score";

const MIN_SCORE_TO_NOTIFY = 0.3;

/**
 * The core job: for every active SearchProfile, pull fresh listings from
 * whichever providers are configured, upsert them, score them against the
 * profile, persist any new above-threshold Match rows, and email a digest
 * of the ones that are new since last run. Designed to be safe to run
 * repeatedly (e.g. from a daily cron — see app/api/cron/match-and-notify) —
 * upserts and the (profileId, listingId) unique constraint make it
 * idempotent.
 */
export async function runMatchingForAllProfiles(): Promise<{
  profilesProcessed: number;
  newMatches: number;
  notificationsSent: number;
}> {
  const profiles = await prisma.searchProfile.findMany({
    where: { active: true },
    include: { user: true },
  });

  let newMatches = 0;
  let notificationsSent = 0;

  for (const profile of profiles) {
    const found = await searchAllProviders({
      city: profile.city ?? undefined,
      region: profile.region ?? undefined,
      country: profile.country,
      lat: profile.lat ?? undefined,
      lng: profile.lng ?? undefined,
      radiusKm: profile.radiusKm,
      minPrice: profile.minPrice ?? undefined,
      maxPrice: profile.maxPrice,
      currency: profile.currency,
      minBedrooms: profile.minBedrooms ?? undefined,
      minBathrooms: profile.minBathrooms ?? undefined,
      moveInEarliest: profile.moveInEarliest ?? undefined,
      moveInLatest: profile.moveInLatest ?? undefined,
      amenities: profile.amenities,
      petFriendly: profile.petFriendly,
      limit: 40,
    });

    const listings = await upsertListings(found);

    const newlyCreatedMatchIds: string[] = [];
    for (const listing of listings) {
      const { score } = scoreListing(listing, profile);
      if (score == null || score < MIN_SCORE_TO_NOTIFY) continue;

      const existing = await prisma.match.findUnique({
        where: { profileId_listingId: { profileId: profile.id, listingId: listing.id } },
      });
      if (existing) continue;

      const match = await prisma.match.create({
        data: { profileId: profile.id, listingId: listing.id, score },
      });
      newlyCreatedMatchIds.push(match.id);
      newMatches++;
    }

    if (newlyCreatedMatchIds.length > 0 && profile.user.email) {
      const newMatchRows = await prisma.match.findMany({
        where: { id: { in: newlyCreatedMatchIds } },
        include: { listing: true },
        orderBy: { score: "desc" },
      });
      const sent = await sendMatchNotification(
        profile.user.email,
        profile,
        newMatchRows.map((m) => m.listing)
      );
      if (sent) {
        await prisma.match.updateMany({
          where: { id: { in: newlyCreatedMatchIds } },
          data: { notifiedAt: new Date() },
        });
        notificationsSent++;
      }
    }
  }

  return { profilesProcessed: profiles.length, newMatches, notificationsSent };
}
