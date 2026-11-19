# CITI VIEW REAL ESTATE

A U.S. real estate marketplace for homes for sale, rentals, new construction, commercial property and land. Shoppers search on a map, save homes, tour, apply for rentals and pay rent; owners list for sale or rent; agents and property managers work leads and applications; staff run the marketplace from an admin CMS.

> **Demo data.** Out of the box, every listing, agent, review, rate and statistic is fictional. Listing photos are original AI-generated illustrations made for this project and credited as such, or come from official free-to-use APIs with attribution. Nothing is scraped or hotlinked from Zillow, Redfin, Realtor.com or any other site. Real listings come only from a licensed MLS/IDX feed (see [Connecting a licensed MLS / IDX feed](#connecting-a-licensed-mls--idx-feed)).

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Environment variables](#environment-variables)
- [Testing and quality gates](#testing-and-quality-gates)
- [Deploying to Vercel](#deploying-to-vercel)
- [Connecting a licensed MLS / IDX feed](#connecting-a-licensed-mls--idx-feed)
- [Compliance checklist before launch](#compliance-checklist-before-launch)
- [Project structure](#project-structure)
- [Scripts](#scripts)

## Features

| Area | What's included |
| --- | --- |
| Search | Buy, rent, new construction, sold, commercial and land modes; map + list with draw-to-search; filters kept in shareable URLs; natural-language search (rule-based, optional Claude); saved searches with email and push alerts |
| Listing pages | Room-categorized photo galleries with lightbox, facts and features, price and tax history, schools, neighborhood and climate-risk data, payment calculator, tour and contact forms, compare, notes, shared collections |
| SEO | Programmatic vertical × place pages (`/homes-for-sale/austin-tx`, `/apartments-for-rent/denver-co/…`), place hubs for states, cities and neighborhoods with market stats and FAQ structured data, sitemaps, robots rules, canonical + `noindex` for filtered permutations, JSON-LD throughout |
| Accounts | Email magic link and Google sign-in (Auth.js), favorites, collections with invites, saved searches, notifications, messaging, tours |
| Rentals | Six-step application with autosave, application fees, approval → e-signed lease (PDF), online rent with first/last-month proration, receipts |
| Selling | Comps-based home value estimate with range and confidence, net proceeds, seller consultation, "for sale by owner" posting with photo uploads and Fair Housing language checks |
| Money tools | Mortgage, affordability, closing costs by state, rent vs. buy, rates, down payment assistance, rent affordability, cost of living, rent trends, partner-lender pre-approval |
| Professionals | Agent directory and profiles, brokerages, property managers, pro dashboard (leads, listings, tours, applications), Free / Pro / Premier plans on Stripe subscriptions |
| Admin & CMS | Listings editor and media manager, CSV import, agent routing controls, lead reassignment, Markdown CMS with sanitized preview, place copy, moderation queue, compliance settings |
| Trust | Fair Housing checks on listing copy, report-a-listing moderation, rate limiting, CSRF (same-origin) checks, Zod validation on every API, upload re-encoding that strips EXIF/GPS, WCAG 2.2 AA target |

## Tech stack

Next.js 15 (App Router, React 19, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · Framer Motion · PostgreSQL via Prisma (PostGIS when available) · optional Typesense search · Auth.js · Zod · React Hook Form · TanStack Query · MapLibre GL / Mapbox · Resend email · Stripe · Vercel Blob · Vitest + Playwright + axe-core.

## Run it locally

Requirements: Node.js 22+ and npm. No Docker needed: `db:start` runs a project-local PostgreSQL.

```bash
npm install
cp .env.example .env.local      # then set AUTH_SECRET:  npx auth secret
npm run db:start                # PostgreSQL on :54329, data in .data/ (keep this terminal open)
npm run db:push                 # create the tables
npm run db:seed                 # demo listings, photos, agents, schools, rentals, posts…
npm run dev                     # http://localhost:3000
```

With demo mode on, `/sign-in` offers one-click demo accounts: home buyer, renter, FSBO seller, agent, property manager and admin. Emails go to the dev outbox at `/dev/outbox` until you add a Resend key; payments use a built-in simulated checkout until you add Stripe test keys.

To preview a production build (faster, and what the end-to-end tests use):

```bash
NEXT_DIST_DIR=.next-prod npm run build
node scripts/serve-prod.mjs      # http://localhost:3000
```

## Environment variables

Copy `.env.example` to `.env.local`. Only the database URLs and `AUTH_SECRET` are required; every other service falls back to a safe local behavior when its key is empty. Never commit real secrets.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Always | Pooled and direct PostgreSQL URLs (they can be the same locally) |
| `AUTH_SECRET` | Always | `npx auth secret` |
| `AUTH_TRUST_HOST` | Always | `true` behind Vercel or any proxy |
| `NEXT_PUBLIC_SITE_URL` | Always | Canonical origin, used for canonical URLs, sitemaps, emails and Stripe redirects |
| `NEXT_PUBLIC_DEMO_MODE` | Always | `true` shows demo banners, one-click demo sign-in and template notices; set `false` in production |
| `NOINDEX` | Optional | `true` serves a disallow-all `robots.txt` (use for public demos and staging); Vercel preview deployments are blocked automatically |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google sign-in | Redirect URI: `https://<domain>/api/auth/callback/google` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email | Use a sender on a domain verified in Resend |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional | Without it, maps use MapLibre with free OpenFreeMap tiles |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | Test keys in development. Without them, a simulated checkout is used |
| `STRIPE_PRICE_AGENT_PRO`, `STRIPE_PRICE_AGENT_PREMIER` | Agent plans | Recurring monthly Price IDs ($49 and $149 in the demo copy) |
| `UPLOAD_DRIVER`, `BLOB_READ_WRITE_TOKEN` | Photo uploads | `local` stores files in `.data/uploads` (dev/self-host only); use `vercel-blob` on Vercel |
| `NEXT_PUBLIC_IMAGE_CDN` | Optional | `cloudinary:<cloud>` or an imgix base URL for uploaded and feed photos |
| `SEARCH_PROVIDER` + `TYPESENSE_*` | Optional | `postgres` (default) or `typesense`; run `npm run search:sync` after imports |
| `ANTHROPIC_API_KEY` | Optional | Natural-language search parsing with Claude; the rule-based parser is used otherwise |
| `RESO_API_BASE_URL`, `RESO_TOKEN_URL`, `RESO_CLIENT_ID`, `RESO_CLIENT_SECRET`, `RESO_ORIGINATING_SYSTEM`, `RESO_MEDIA_HOSTS` | MLS feed | See the MLS section below. `RESO_MEDIA_HOSTS` must be set at build time |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push | `node scripts/generate-vapid.mjs` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Recommended in production | Shares rate limits across serverless instances (in-memory otherwise) |
| `CRON_SECRET` | Scheduled jobs | Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/*` |
| `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `UNSPLASH_APP_NAME` | Optional | Only for refreshing the stock-photo seed pool (`npm run media:fetch`) |

## Testing and quality gates

```bash
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # ESLint (Next + TypeScript rules)
npm test                 # Vitest unit tests: mortgage/closing-cost/rent-vs-buy math, home value model,
                         # rent proration, Fair Housing checks, Markdown sanitizing, search filters,
                         # admin schemas, RESO feed mapping
npm run test:e2e         # Playwright against a production build on :3000 (starts scripts/serve-prod.mjs
                         # if nothing is running): page smoke tests on desktop + mobile, distinct galleries,
                         # sitemaps/robots/canonicals, buyer/admin flows, role enforcement, and axe
                         # WCAG 2.2 AA scans in light and dark mode
npm run check:links      # crawls internal links and reports anything that isn't a 200
```

Notes:

- End-to-end tests expect the demo seed (`npm run db:seed`) and demo mode on. Point them at another environment with `E2E_BASE_URL=https://staging.example.com npm run test:e2e`.
- If Playwright's bundled browser isn't installed, run `npx playwright install chromium`, or use an installed browser with `PW_CHANNEL=chrome` (or `msedge`).

## Deploying to Vercel

1. **Database.** Create a PostgreSQL database with PostGIS available, such as Neon, Supabase or Vercel Postgres. Use the pooled connection string for `DATABASE_URL` and the direct one for `DIRECT_URL`.
2. **Project.** Import the GitHub repository into Vercel (framework: Next.js). The build command `npm run build` runs `prisma generate && next build`.
3. **Environment variables.** Set everything from the table above for Production (and Preview, if you use it). At minimum set `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL=https://<your-domain>`, `UPLOAD_DRIVER=vercel-blob` and `CRON_SECRET`.
   - **Public demo:** keep `NEXT_PUBLIC_DEMO_MODE=true` and set `NOINDEX=true`, so fictional listings never reach search engines.
   - **Real launch:** set `NEXT_PUBLIC_DEMO_MODE=false`, configure Resend, Stripe live keys and the MLS feed, and don't seed demo data.
4. **Blob storage.** In Vercel → Storage, create a Blob store and connect it to the project; that sets `BLOB_READ_WRITE_TOKEN`.
5. **Schema.** From your machine, with the production `DATABASE_URL`/`DIRECT_URL` exported, run `npx prisma db push` (or adopt migrations with `npm run db:migrate` and use `npm run db:deploy` in CI), then `npm run db:postgis`. Seed only demo or staging databases: `npm run db:seed` deletes and recreates data.
6. **Stripe.** Create the two recurring Prices for agent plans. Then add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` for these events, and put its signing secret in `STRIPE_WEBHOOK_SECRET`:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. **Cron jobs.** `vercel.json` schedules saved-search alerts (daily, 13:00 UTC) and the MLS feed sync (daily, 10:30 UTC). The Hobby plan allows one run per day. On Pro, run `/api/cron/feed-sync` every 15–60 minutes, since most MLSs require IDX data to be refreshed at least every 12 hours.
8. **Domain and SEO.** Add your domain, make `NEXT_PUBLIC_SITE_URL` match it exactly, and submit `https://<your-domain>/sitemap.xml` in Google Search Console.
9. **Check the deployment.** Run `E2E_BASE_URL=https://<staging-domain> npm run test:e2e` against a staging deployment that has demo data, and `node scripts/check-links.mjs https://<your-domain>`.

## Connecting a licensed MLS / IDX feed

CITI VIEW ingests listings over the [RESO Web API](https://www.reso.org/reso-web-api/) using OAuth2 client credentials, the method used by most feed vendors (Bridge Interactive, CoreLogic Trestle, Spark Platform, MLS Grid…).

**Before you start**

1. Your brokerage must be a participant in the MLS and have a signed IDX (or VOW) data license agreement.
2. Request API credentials for your MLS's dataset from its vendor. You'll get a base URL, a token URL, a client ID and a secret.
3. Read the MLS's IDX display rules. They typically require listing-brokerage attribution, specific disclaimer text and logo, a maximum data age (often 12 hours), and honoring seller opt-outs. Put the required disclaimer text in **Admin → Settings → IDX disclaimer**.

**Configure and run**

```bash
# .env.local (or Vercel project settings)
RESO_API_BASE_URL="https://api.example-vendor.com/odata/<dataset>"
RESO_TOKEN_URL="https://api.example-vendor.com/oauth2/token"
RESO_CLIENT_ID="…"
RESO_CLIENT_SECRET="…"
RESO_ORIGINATING_SYSTEM="actris"          # short MLS code; used in each listing's feed key
RESO_MEDIA_HOSTS="photos.example-vendor.com"  # photo CDN host(s); rebuild after changing

npm run feed:sync -- --dry-run --limit=50    # map 50 records and report what would be skipped
npm run feed:sync -- --full                  # first full import
npm run feed:sync                            # incremental: records modified since the last sync
```

After that, `/api/cron/feed-sync` keeps the data current: it's an incremental sync, and adding `?full=1` runs a full refresh.

**What the sync does** (`src/lib/feeds/reso-map.ts`, `src/server/feeds/reso-sync.ts`)

- **Fetching.** It pages through `Property` records with `$expand=Media` and upserts them as `FEED` listings keyed by `<RESO_ORIGINATING_SYSTEM>:<ListingKey>`. URL slugs stay stable across updates.
- **Field mapping.** It maps RESO Data Dictionary fields onto CITI VIEW's model:
  - `StandardStatus` → status (Active, Coming Soon, Pending, Closed → Sold; Canceled, Expired, Withdrawn → off market).
  - `PropertyType` and `PropertySubType` → category and property type (including residential and commercial leases).
  - Address, coordinates, price, beds, baths, square footage, lot, year built, HOA dues (normalized to monthly), taxes, pool, waterfront, view, pets, new construction and the unbranded virtual tour.
- **IDX rules.**
  - Listings with `InternetEntireListingDisplayYN = false` are never shown, and are taken down if they were already live.
  - `InternetAddressDisplayYN = false` withholds the street address everywhere: cards, page titles, structured data and emails. The URL slug never contains it, and the map pin is offset by a few hundred meters.
  - Only photos whose `Permission` allows IDX are used.
  - Every listing shows "Listing courtesy of <ListOfficeName>".
- **Photos.** Photos are kept in the MLS's order and categorized by room from `ImageOf`, and the feed replaces them on every update. They stay on the vendor's CDN under your license; they aren't copied.
- **History.** Price changes and status changes are written to the price history, so price-drop alerts fire for shoppers.
- **Full syncs.** Feed listings missing from a full sync are taken off market.
- **Markets.** Listings attach to existing markets (cities and neighborhoods). Cities that aren't set up yet are reported, so you can add them with their coordinates and copy (edit copy in **Admin → Places**).

When you go live with real data, set `NEXT_PUBLIC_DEMO_MODE=false`, don't run the demo seed, and if you use Typesense, run `npm run search:sync` after large imports.

## Compliance checklist before launch

- [ ] Brokerage of record name, office address, phone and license numbers set in **Admin → Settings**. They appear in every page footer.
- [ ] MLS-required IDX disclaimer, logo and attribution rules confirmed with your MLS.
- [ ] Fair Housing statement and Equal Housing Opportunity logo reviewed. Listing-copy checks are on by default, for both owners and staff.
- [ ] State consumer notices filled in (for example the Texas IABS or New York Standardized Operating Procedures) in **Admin → Settings → State notices**.
- [ ] `/legal/*` pages (terms, privacy, accessibility, fair housing, listing data) reviewed and adapted by counsel. They're templates; bracketed items are placeholders.
- [ ] Privacy: cookie preferences (CCPA/CPRA "Do Not Sell or Share", Global Privacy Control honored), data retention periods, and a process for access and deletion requests.
- [ ] Rental application fees and screening comply with each state's rules. If you add tenant screening, use an FCRA-compliant consumer reporting agency.
- [ ] Image rights: only licensed feed photos and owner uploads. No scraping or hotlinking from other portals.
- [ ] Accessibility: run the axe suite (`npm run test:e2e`), do a keyboard pass, and publish a real contact in the accessibility statement.

## Project structure

```
src/
  app/(site)/         pages: search catch-all + place hubs, property, account, agent (pro), admin, rent,
                      mortgage, sell, learn, legal …
  app/api/            route handlers (all mutations: same-origin + auth + rate limit + Zod)
  app/sitemap.xml/    sitemap index; app/sitemaps/[file] per-type sitemaps; app/robots.ts
  components/         UI by feature (search, listing, gallery, admin, places, charts, ui/ = shadcn)
  lib/                pure logic: finance, avm, rent periods, fair housing, search filters, validation,
                      RESO mapping, markdown sanitizing
  server/             server-only data access: search providers, listings, leads, rentals, billing,
                      payments, uploads/storage, place hubs, sitemaps, feeds
prisma/               schema, seed (demo data), PostGIS SQL
scripts/              db, media, feed sync, alerts, search sync, link checker, prod preview
tests/unit, tests/e2e Vitest and Playwright suites
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `start` | Production build / server |
| `npm run db:start` | Local embedded PostgreSQL (data in `.data/`, git-ignored) |
| `npm run db:push` / `db:migrate` / `db:deploy` | Sync the Prisma schema / create a migration / apply migrations |
| `npm run db:seed` / `db:reset` | Seed demo data / reset and reseed |
| `npm run db:postgis` | Apply the PostGIS layer (when the server supports it) |
| `npm run feed:sync` | Import from the licensed RESO Web API feed |
| `npm run alerts:run` | Send saved-search and price-drop alerts once |
| `npm run search:sync` | Rebuild the Typesense index |
| `npm run media:fetch` / `media:verify` | Refresh the stock-photo seed pool / verify gallery rules |
| `npm run typecheck` / `lint` / `test` / `test:e2e` / `check:links` | Quality gates |
