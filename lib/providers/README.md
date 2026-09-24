# Listing providers

Every data source is an adapter implementing `ListingProvider` (`types.ts`):
`search(criteria) => NormalizedListing[]`, plus `isConfigured()` so the
registry (`index.ts`) can skip providers with no API key set.

**Sourcing rule for this project: official APIs / licensed partner feeds
only.** Do not add an adapter that scrapes a site whose Terms of Service
prohibit automated access (this ruled out direct scraping of Zillow,
Apartments.com, Craigslist, Realtor.com, etc. — see the top-level README's
"Data sourcing" section for the reasoning). If you want coverage from one of
those sites, use their official partner/affiliate API program if one exists,
not an unauthorized scraper.

## Shipped

- `mockProvider.ts` — deterministic sample data, always "configured". Used
  when no real provider has credentials, so local dev/CI need nothing.
- `rentcastProvider.ts` — [RentCast](https://www.rentcast.io/api), US-only,
  licensed rental data API with a free tier. Set `RENTCAST_API_KEY`.

Any adapter that calls a metered API must go through `cache.ts`
(`getCachedResponse` / `reserveMonthlyRequest` / `setCachedResponse`), as
`rentcastProvider.ts` does, so searches and the daily cron share cached
responses and can't exceed the provider's monthly quota.

## Adding global coverage

"Global" coverage grows one legitimate regional source at a time. Candidates
worth evaluating (verify current API terms/pricing before integrating —
this list is a starting point, not a commitment that any given one is
still free or still offers public API access):

- UK: Zoopla / Rightmove partner APIs (partnership approval typically
  required).
- Australia / NZ: Domain Group API.
- Canada: provincial MLS/CREA data feeds (access-gated).
- EU: national portals vary widely; no single pan-EU API.

Each becomes a new file next to this one, registered in `index.ts`. Keep the
region's currency/units mapped into `NormalizedListing`'s USD-agnostic
shape (`currency` is a field, not assumed) so the matching engine and UI
never need to know which provider a listing came from.
