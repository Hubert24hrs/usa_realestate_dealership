/**
 * Pull listings from a licensed RESO Web API feed (same logic as /api/cron/feed-sync).
 *
 *   npm run feed:sync                    # incremental: records changed since the last sync
 *   npm run feed:sync -- --full          # everything; feed listings that disappeared go off market
 *   npm run feed:sync -- --dry-run --limit=50   # map and report without writing
 *   npm run feed:sync -- --since=2026-11-01T00:00:00Z
 *
 * Cached pages refresh within their revalidation window (≤ 30 minutes) after a CLI run.
 */
import { syncResoFeed } from "../src/server/feeds/reso-sync";

const arg = (name: string) => process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name: string) => arg(name)?.split("=")[1];

const since = value("since");
syncResoFeed({ full: Boolean(arg("full")), dryRun: Boolean(arg("dry-run")), limit: value("limit") ? Number(value("limit")) : undefined, since: since ? new Date(since) : undefined })
  .then((s) => {
    console.log(`Fetched ${s.fetched} · created ${s.created} · updated ${s.updated} · off market ${s.offMarket} · skipped ${s.skipped.length}${s.dryRun ? " (dry run)" : ""}`);
    if (s.skipped.length) console.log("Skipped (first 20):", s.skipped.slice(0, 20));
    if (s.unmatchedCities.length) console.log("Cities not yet set up as CITI VIEW markets (listings saved without a city page):", s.unmatchedCities.join("; "));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
