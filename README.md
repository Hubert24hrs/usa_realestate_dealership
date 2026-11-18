# CITI VIEW REAL ESTATE

A USA real estate marketplace for residential sales, rentals, new construction, commercial and land — built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma + PostgreSQL (PostGIS-ready), Auth.js, TanStack Query and Mapbox/MapLibre.

> **All listings, agents, reviews and statistics in this repository are fictional demo data.** Seed imagery comes only from official free-to-use APIs (Pexels/Unsplash, with attribution) or from CITI VIEW's own procedurally generated illustrations — nothing is scraped or hotlinked from listing portals.

## Quick start (local, no Docker required)

```bash
npm install
cp .env.example .env.local      # then set AUTH_SECRET (npx auth secret)
npm run db:start                # project-local PostgreSQL on :54329 (keep this running)
npm run db:push                 # create tables
npm run db:seed                 # ~105 demo listings, 1,000+ images, agents, schools…
npm run dev                     # http://localhost:3000
```

### Real listing photos (optional)

1. Get a free key at <https://www.pexels.com/api/> (and/or an Unsplash access key).
2. Add `PEXELS_API_KEY=…` to `.env.local`.
3. `npm run media:fetch` → writes `data/media-pool.json` (URLs + attribution only).
4. `npm run db:seed` → every property gets 8–12 different, room-categorised photos.
5. `npm run media:verify` → checks counts, uniqueness (within and across properties) and alt text.

Without a key, each property gets original generated illustrations by room category, plus a generated floor plan (or topography map for land).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run db:start` | Local embedded PostgreSQL (data in `.data/`, git-ignored) |
| `npm run db:push` / `db:migrate` | Sync Prisma schema |
| `npm run db:seed` | Reset + seed demo data |
| `npm run db:postgis` | Apply the PostGIS layer (only when the server offers PostGIS) |
| `npm run media:fetch` / `media:verify` | Fetch stock-photo pools / verify gallery rules |
| `npm run typecheck` / `lint` / `test` / `test:e2e` | Quality gates |

## Architecture notes

- **Image providers** (`src/lib/media`): `ImageProvider` interface with `SeedProvider` (Pexels + Unsplash official APIs, attribution and Unsplash download tracking), `FeedProvider` (licensed RESO Web API / IDX stub) and `GeneratedProvider` (original SVG illustrations, floor plans, topo maps). `ListingMedia` stores category, alt text, blur placeholder, provider and attribution for every image.
- **PostGIS**: lat/lng live on `Listing`; when the database supports PostGIS, `prisma/sql/postgis.sql` maintains `geo.listing_location` (GiST-indexed) outside Prisma's schema. Without PostGIS, spatial filters fall back to lat/lng math.
- **Compliance**: Equal Housing Opportunity mark, configurable IDX/MLS disclaimers, state notices and license placeholders (`SiteSetting`), CCPA/GDPR cookie manager honoring Global Privacy Control.

Full documentation (env vars, deploying to Vercel, connecting a licensed MLS/IDX feed) is completed in Phase 8.
