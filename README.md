# NestMatch

Find housing anywhere, save what you're looking for as a profile, and get
notified the moment a new listing fits — instead of manually re-checking
listing sites.

## What this is (and isn't)

This started as a request for an "apartment scraper." It's built instead as
an **aggregator over licensed/official rental data APIs**, for a reason
worth stating plainly:

Most large rental listing sites (Zillow, Apartments.com, Craigslist,
Realtor.com, and similar) prohibit automated scraping in their Terms of
Service and run active anti-bot defenses. Beyond the ToS violation itself,
unauthorized scraping of a site that says not to has been found legally
risky in real cases (the CFAA "unauthorized access" line of cases, e.g.
*hiQ Labs v. LinkedIn* and its aftermath, turned on exactly this question).
Rather than build something that starts breaking (or gets its IP banned)
the moment a target site changes its markup or notices the traffic pattern,
NestMatch is architected around a **pluggable provider interface**
(`lib/providers/`) where each data source is a small adapter against a
real API — paid, free-tier, or partner feed — never a scrape of a site that
disallows it.

That's also *why* "global" coverage isn't a single flag to flip: no rental
API covers every country today, so global support means adding one
legitimate regional provider at a time behind the same interface. See
`lib/providers/README.md`.

## Current scope (MVP)

Per the actual first build:

- **Search** — one form (location, price, bedrooms, pet-friendly) hits
  every configured provider and shows normalized results.
- **Saved profiles** — a signed-in user can save a set of criteria
  (location + radius, price range, bedrooms/bathrooms, amenities,
  pet-friendly, move-in window, minimum rating).
- **Automatic matching + notification** — a daily job
  (`app/api/cron/match-and-notify`, wired to Vercel Cron) re-runs every
  active profile against fresh provider data, scores each listing
  (`lib/matching/score.ts`), and emails a digest of new matches via Resend.
- **Neighborhood info** — a listing's detail page surfaces nearby fitness
  (gyms), student life (universities), local food (restaurants), recreation
  (parks), and community/errands (grocery) via the Google Places API,
  cached in `NeighborhoodCache` so repeat views don't re-hit the API.
- **Reviews** — surfaced wherever the underlying provider supplies a rating
  (`Listing.rating` / `reviewCount`), and usable as a saved-profile filter
  (`minRating`). Aggregating third-party reviews beyond what a listing
  provider already returns is out of scope for the MVP (see Roadmap).

Not yet built: per-profile push/SMS notifications (email only for now),
multi-country coverage (one region-specific real adapter is live —
`rentcastProvider.ts`, US-only — everything else runs on the bundled mock
provider until more regional adapters are added), and a dedicated reviews
aggregation layer.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Google OAuth + Resend-backed magic links) — `session: database`
  strategy, so signing out anywhere revokes the session everywhere
- Resend for transactional email (magic links + match-notification digests)
- Vercel Cron for the daily matching job (`vercel.json`)
- Google Places API for neighborhood insights (optional — the app runs
  without it, just without that section)

## Known audit finding: `nodemailer`

`npm audit` flags `nodemailer` (pulled in transitively by
`next-auth/providers/email`) for several unpatched advisories (SSRF via
`disableFileAccess`/`disableUrlAccess` bypass, TLS validation in OAuth2
token fetch, etc.) — all in its actual mail-sending transports. This app
never calls into any of them: `EmailProvider` is configured with
`sendVerificationRequest` fully overridden to send via Resend's HTTP API
directly (`lib/auth.ts`), `server` is left blank, and no code path ever
constructs a nodemailer transporter or calls `sendMail`/`resolveContent`.
`nodemailer` is present purely because `next-auth`'s email provider module
has a static `require("nodemailer")` that the bundler needs to resolve.
Re-check this if `next-auth` is upgraded past v4 or if a patched
`nodemailer` release lands.

## Getting started

```bash
npm install
cp .env.example .env   # fill in what you have; see below for what's optional
npx prisma db push     # or `npx prisma migrate dev` once you're ready for real migrations
npm run dev
```

Everything in `.env.example` except `DATABASE_URL` is optional for local
dev — unset integrations degrade gracefully:

| Env var | Missing → |
|---|---|
| `RENTCAST_API_KEY` | Search/matching falls back to the deterministic mock provider |
| `RESEND_API_KEY` | Magic links and match emails are logged to the console instead of sent |
| `GOOGLE_CLIENT_ID`/`SECRET` | Google sign-in button errors if clicked; email sign-in still works |
| `GOOGLE_PLACES_API_KEY` | Listing pages omit the neighborhood section |
| `CRON_SECRET` | The cron endpoint rejects all requests (fail closed, not open) |

## Architecture notes

- **`lib/providers/`** — the only place that talks to external listing data
  sources. `types.ts` defines `ListingProvider`; `index.ts` is the registry
  that queries every configured provider and merges results. Add a region
  by adding a file here, not by touching anything downstream.
- **`lib/matching/score.ts`** — hard filters (budget, bedrooms, pet policy,
  move-in window, radius) followed by a weighted soft score (amenities
  overlap, price headroom, distance, rating). Returns `null` for
  disqualified listings so the matching job never notifies on a listing
  that fails a hard requirement.
- **`lib/matching/runMatching.ts`** — the job the cron route calls. Upserts
  provider results into `Listing` (dedup key: `source` + `externalId`), so
  a listing found via ad-hoc search and later matched to a saved profile is
  the same row, and idempotent by the `(profileId, listingId)` unique
  constraint on `Match` — safe to re-run.
- **`lib/neighborhood/googlePlaces.ts`** — one Nearby-Search call per
  category (`fitness`/`student_life`/`food`/`recreation`/`community`),
  cached per ~110m grid cell for two weeks in `NeighborhoodCache` so a
  cluster of listings in the same area shares lookups instead of each
  paying for its own.

## Roadmap

- More regional providers (UK, AU/NZ, Canada — see
  `lib/providers/README.md` for candidates and why each needs its own
  partnership/API-key evaluation before being wired in).
- Push/SMS notification channels alongside email.
- A dedicated reviews aggregation layer (e.g. pulling from a reviews API
  per listing) rather than relying solely on whatever rating a listing
  provider itself returns.
- Multi-recipient sharing of a saved profile (e.g. roommates matching
  together), mirroring the "more than one destination" idea from the
  original notification request.
