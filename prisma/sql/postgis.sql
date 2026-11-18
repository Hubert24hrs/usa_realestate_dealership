-- Optional PostGIS layer. Applied automatically by `npm run db:postgis`
-- (and at the end of the seed) ONLY when the server offers the postgis extension
-- (Neon, Supabase, RDS, local PostGIS…). It lives in its own `geo` schema so
-- Prisma never tries to drop it during `db push` / `migrate`.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS geo;

CREATE TABLE IF NOT EXISTS geo.listing_location (
  listing_id text PRIMARY KEY REFERENCES public."Listing"(id) ON DELETE CASCADE,
  location   geography(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS listing_location_gix
  ON geo.listing_location USING GIST (location);

CREATE OR REPLACE FUNCTION geo.sync_listing_location() RETURNS trigger AS $$
BEGIN
  INSERT INTO geo.listing_location (listing_id, location)
  VALUES (NEW.id, ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography)
  ON CONFLICT (listing_id) DO UPDATE SET location = EXCLUDED.location;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_location_sync ON public."Listing";
CREATE TRIGGER listing_location_sync
  AFTER INSERT OR UPDATE OF lat, lng ON public."Listing"
  FOR EACH ROW EXECUTE FUNCTION geo.sync_listing_location();

-- Backfill existing rows
INSERT INTO geo.listing_location (listing_id, location)
SELECT id, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography FROM public."Listing"
ON CONFLICT (listing_id) DO UPDATE SET location = EXCLUDED.location;
