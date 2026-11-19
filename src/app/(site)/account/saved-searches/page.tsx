import type { Metadata } from "next";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { SavedSearchCard, type SavedSearchView } from "@/components/account/saved-search-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { SEARCH_MODE_LABELS } from "@/lib/domain";
import { formatDate, timeAgo } from "@/lib/format";
import { describeFilters } from "@/lib/search/describe";
import { SearchFiltersSchema } from "@/lib/search/filters";
import { savedSearchStatus } from "@/server/alerts";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Saved searches" };

export default async function SavedSearchesPage() {
  const user = await requireUser("/account/saved-searches");
  const rows = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const now = new Date();
  const searches: SavedSearchView[] = await Promise.all(
    rows.map(async (s) => {
      const parsed = SearchFiltersSchema.safeParse(s.filters);
      const filters = parsed.success ? parsed.data : null;
      const status = filters ? await savedSearchStatus(filters, s.knownListingIds) : { total: 0, fresh: 0 };
      const chips = filters ? [SEARCH_MODE_LABELS[filters.mode], ...describeFilters(filters, filters.mode).map((c) => c.label)] : [];
      const meta = [
        status.fresh ? `${status.fresh} new since your last alert` : null,
        s.lastNotifiedAt ? `Last alert ${timeAgo(s.lastNotifiedAt, now)}` : null,
        `Saved ${formatDate(s.createdAt)}`,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        id: s.id,
        name: s.name,
        path: s.path,
        chips: [...new Set(chips)],
        frequency: s.frequency,
        emailEnabled: s.emailEnabled,
        pushEnabled: s.pushEnabled,
        matchCount: status.total,
        meta,
      };
    }),
  );
  return (
    <>
      <AccountPageHeader
        title="Saved searches"
        description="We check your searches for new listings, price cuts and open houses and alert you on your schedule."
        actions={<Button asChild size="lg" className="rounded-full px-4"><Link href="/homes-for-sale">New search</Link></Button>}
      />
      {searches.length ? (
        <div className="space-y-4">
          {searches.map((s) => (
            <SavedSearchCard key={s.id} search={s} />
          ))}
        </div>
      ) : (
        <EmptyState icon={BellRing} title="No saved searches" action={<Button asChild><Link href="/homes-for-sale">Search homes</Link></Button>}>
          Set your filters or draw an area on the map, then tap “Save search” to get alerts when new homes match.
        </EmptyState>
      )}
    </>
  );
}
