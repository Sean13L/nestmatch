import type { Listing, SearchProfile } from "@prisma/client";

/** Great-circle distance in km — used for the profile's search radius. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface ScoreResult {
  /** null means the listing is disqualified — a hard requirement failed. */
  score: number | null;
  reasons: string[];
}

/**
 * Hard filters (must all pass, or the listing is disqualified) followed by
 * a weighted soft score (0–1) over amenities overlap, price headroom,
 * distance, and rating. Missing listing data (e.g. no rating yet) never
 * fails a hard filter on its own — only an explicit mismatch does — but it
 * also earns no bonus in the soft score, so profiles with strict criteria
 * naturally prefer listings with more complete data.
 */
export function scoreListing(listing: Listing, profile: SearchProfile): ScoreResult {
  const reasons: string[] = [];

  if (listing.country.toLowerCase() !== profile.country.toLowerCase()) {
    return { score: null, reasons: ["country mismatch"] };
  }

  if (listing.price > profile.maxPrice) {
    return { score: null, reasons: ["over budget"] };
  }
  if (profile.minPrice != null && listing.price < profile.minPrice) {
    return { score: null, reasons: ["under minimum price"] };
  }

  if (profile.minBedrooms != null && (listing.bedrooms ?? 0) < profile.minBedrooms) {
    return { score: null, reasons: ["not enough bedrooms"] };
  }
  if (profile.minBathrooms != null && (listing.bathrooms ?? 0) < profile.minBathrooms) {
    return { score: null, reasons: ["not enough bathrooms"] };
  }

  if (profile.petFriendly && !listing.petFriendly) {
    return { score: null, reasons: ["not pet friendly"] };
  }

  if (profile.moveInLatest && listing.availableFrom && listing.availableFrom > profile.moveInLatest) {
    return { score: null, reasons: ["available too late"] };
  }

  let distanceKm: number | null = null;
  if (profile.lat != null && profile.lng != null && listing.lat != null && listing.lng != null) {
    distanceKm = haversineKm(profile.lat, profile.lng, listing.lat, listing.lng);
    if (distanceKm > profile.radiusKm) {
      return { score: null, reasons: [`outside ${profile.radiusKm}km radius`] };
    }
  }

  if (profile.minRating != null && listing.rating != null && listing.rating < profile.minRating) {
    return { score: null, reasons: ["below minimum rating"] };
  }

  // --- soft scoring ---------------------------------------------------
  let score = 0;
  let weightTotal = 0;

  // Amenity overlap (weight 0.4)
  if (profile.amenities.length > 0) {
    const matched = profile.amenities.filter((a) => listing.amenities.includes(a));
    score += 0.4 * (matched.length / profile.amenities.length);
    weightTotal += 0.4;
    if (matched.length > 0) reasons.push(`matches ${matched.length}/${profile.amenities.length} amenities`);
  }

  // Price headroom under budget (weight 0.25) — cheaper relative to budget scores higher.
  const budgetFloor = profile.minPrice ?? 0;
  const budgetRange = profile.maxPrice - budgetFloor;
  if (budgetRange > 0) {
    const headroom = (profile.maxPrice - listing.price) / budgetRange;
    score += 0.25 * Math.max(0, Math.min(1, headroom));
    weightTotal += 0.25;
  }

  // Distance (weight 0.2) — closer to center scores higher.
  if (distanceKm != null) {
    const closeness = 1 - Math.min(distanceKm / profile.radiusKm, 1);
    score += 0.2 * closeness;
    weightTotal += 0.2;
    reasons.push(`${distanceKm.toFixed(1)}km away`);
  }

  // Rating (weight 0.15)
  if (listing.rating != null) {
    score += 0.15 * Math.min(listing.rating / 5, 1);
    weightTotal += 0.15;
    reasons.push(`rated ${listing.rating.toFixed(1)}/5`);
  }

  // Normalize against whatever weight was actually applicable, so a
  // profile with no amenities/rating/location set still yields a usable
  // 0–1 score instead of always being penalized toward 0.
  const normalized = weightTotal > 0 ? score / weightTotal : 0.5;

  return { score: normalized, reasons };
}
