import "server-only";
import type { SearchFilters } from "@/lib/search/filters";
import type { SearchResult, Suggestion } from "@/lib/search/types";

/**
 * SearchProvider abstraction. The default PostgreSQL provider needs no extra
 * services; set SEARCH_PROVIDER=typesense (+ TYPESENSE_*) to route full-text
 * queries and facets through Typesense once the index is synced
 * (npm run search:sync).
 */
export interface SearchProvider {
  readonly id: string;
  search(filters: SearchFilters, options?: { pageSize?: number; withPoints?: boolean; withFacets?: boolean }): Promise<SearchResult>;
  suggest(query: string, limit?: number): Promise<Suggestion[]>;
}

let cached: SearchProvider | null = null;

export async function getSearchProvider(): Promise<SearchProvider> {
  if (cached) return cached;
  if (process.env.SEARCH_PROVIDER === "typesense" && process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY) {
    const { TypesenseSearchProvider } = await import("./typesense");
    cached = new TypesenseSearchProvider();
  } else {
    const { PostgresSearchProvider } = await import("./postgres");
    cached = new PostgresSearchProvider();
  }
  return cached;
}
