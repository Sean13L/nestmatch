# Project: NestMatch

## Purpose
Housing search across data sources, plus saved "profiles" of what a user is looking for. A job re-checks profiles against fresh listings and emails the user when something new fits, so they don't have to keep re-checking listing sites. Meant to work globally over time: fitness, student life, community, local food and recreation near each listing are part of the product.

## Separate from Studdy
This is its own product and repo (`Sean13L/nestmatch`). It is **not** part of Studdy (`Sean13L/AIO`, the AI syllabus assistant), even though it was first scaffolded from a session opened on that repo. Don't import code, share a database, reuse Studdy's Vercel/Neon projects, or apply Studdy's `CLAUDE.md` conventions here. Some patterns were deliberately copied over (mock fallback when an API key is missing, Resend magic links); they live independently in this codebase.

## Non-negotiable: no scraping
The original request was for an "apartment scraper". On 2026-09-21 the user chose **official APIs and licensed partner feeds only**. Do not add code that scrapes a site whose Terms of Service forbid automated access. That rules out Zillow, Apartments.com, Craigslist, Realtor.com and similar, and it applies even if a request asks for "scraping" later: say what the ToS/legal risk is and propose the site's official API or partner program instead. The reasoning is in `README.md` under "What this is (and isn't)".

## Scope
The user chose an **MVP-first** build: one real region, and a working search → profile → match → notify loop before expanding. Not built yet (see README Roadmap): more regional providers, push/SMS notifications, a dedicated reviews-aggregation layer, and profiles shared between roommates.

## Architecture
- `lib/providers/`: the only code that talks to listing sources. Each source implements `ListingProvider` (`types.ts`) and returns `NormalizedListing[]`. `index.ts` queries every provider whose `isConfigured()` is true. If none are, it falls back to `mockProvider`, so a fresh clone works with no API keys. To add a region, add an adapter file and register it in `index.ts`; nothing downstream should need to know which provider a listing came from. Current adapters: `mockProvider.ts` (deterministic sample data) and `rentcastProvider.ts` (RentCast, US-only, `RENTCAST_API_KEY`). RentCast's field mapping in `normalize()` was written from their docs and hasn't been tested against a live key yet.
- `lib/matching/score.ts`: hard filters (country, budget, bedrooms/bathrooms, pet policy, move-in-by date, radius, minimum rating) return `score: null`. Listings that pass get a weighted soft score over amenity overlap, price headroom, distance and rating, normalized over only the weights that apply. Missing listing data never fails a hard filter on its own.
- `lib/matching/runMatching.ts`: the job behind `app/api/cron/match-and-notify`. It upserts listings (dedup key `source` + `externalId`), creates `Match` rows scoring at least `MIN_SCORE_TO_NOTIFY`, emails a digest of the new ones, and sets `notifiedAt`. It's idempotent via the `(profileId, listingId)` unique key, so re-running it is safe.
- `app/api/listings/search`: ad-hoc search from the homepage. It uses the same upsert path as the matching job, so the same listing always ends up in the same DB row.
- `lib/neighborhood/googlePlaces.ts`: one Google Places Nearby Search per category (`fitness`→gym, `student_life`→university, `food`→restaurant, `recreation`→park, `community`→grocery). Results are cached in `NeighborhoodCache` for 14 days, keyed by coordinates rounded to about 110m. Without `GOOGLE_PLACES_API_KEY` it returns `{}` and the listing page hides the section.
- `lib/notifications/email.ts`: match digests via Resend. Without `RESEND_API_KEY` it logs and returns `false`; the `Match` rows are still saved, just not marked notified.
- `lib/auth.ts`: NextAuth v4 with Google OAuth and email magic links sent through Resend's HTTP API (`sendVerificationRequest` is fully overridden). Sessions are stored in the database (`session: "database"`). A `session` callback adds `user.id`, with the type augmentation in `lib/next-auth.d.ts`.
- Data model (`prisma/schema.prisma`): the NextAuth tables, plus `SearchProfile` (one user can have several), `Listing`, `Match`, and `NeighborhoodCache`. Amenities are free-form string keys like `gym`, `in_unit_laundry`, `pet_friendly`, matched by exact string. Keep the keys consistent between providers and the `AMENITY_OPTIONS` list in `app/profiles/new/page.tsx`.

## Stack and version notes
- **Next.js 16** (App Router, Turbopack). The scaffold started on 14.2.15 but moved to 16 because every 14.x release, including 14.2.35, carried unpatched critical advisories. Consequences:
  - Dynamic route `params` is a `Promise`. Use `{ params }: { params: Promise<{ id: string }> }` with `const { id } = await params;` in both pages and route handlers.
  - `next lint` no longer exists. `npm run lint` runs `eslint .` using the flat config in `eslint.config.mjs`, which imports `eslint-config-next/core-web-vitals` and `/typescript` directly. Don't use `FlatCompat`: it crashes with a circular-JSON error on this version.
  - ESLint is pinned to v9. `eslint-config-next@16` needs at least 9, and v10 hasn't been tested here.
- React 18 (Next 16 still accepts it), Tailwind 3, Prisma 5 with Postgres, zod for validating request bodies.
- `nodemailer` is a dependency only because `next-auth/providers/email` has a static `require` on it that the bundler must resolve. The app never calls it. `npm audit` flags it with no fix available; the README explains why that path can't be reached. Recheck if `next-auth` is upgraded.
- Hosting target: Vercel, with a daily cron (`vercel.json`, 13:00 UTC) because the Hobby plan only allows daily crons. Postgres on Neon. Both must be **separate projects from Studdy's**.

## Commands
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run lint`
- `npx prisma db push` syncs the schema (no migrations folder yet; CI uses `db push` too). Switch to `prisma migrate` once real data exists.
- CI (`.github/workflows/ci.yml`) runs install, `prisma generate`, `db push` against a Postgres service container, then typecheck, lint and build.

## Environment
See `.env.example`. Only `DATABASE_URL` is required for local dev; every integration degrades gracefully when its key is missing (see the README table). `CRON_SECRET` fails closed: if it's unset, the cron route rejects every request. The Google OAuth client ("NestMatch web client") has a registered redirect for `http://localhost:3000/api/auth/callback/google`. Each deployed domain needs its own origin and `/api/auth/callback/google` redirect added in Google Cloud Console.
