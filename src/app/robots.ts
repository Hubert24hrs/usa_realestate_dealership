import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Crawl rules. Private and per-user areas are disallowed (rules are prefix matches, so the pro
 * dashboard is "/agent$" + "/agent/" to keep the public /agents directory crawlable); filtered search permutations are handled
 * with noindex + canonical on the page itself. Set NOINDEX=true (or deploy a Vercel preview) to keep
 * a demo or staging deployment out of search engines entirely.
 */
export default function robots(): MetadataRoute.Robots {
  const blockAll = process.env.NOINDEX === "true" || process.env.VERCEL_ENV === "preview";
  return {
    rules: blockAll
      ? { userAgent: "*", disallow: "/" }
      : {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/account", "/admin", "/agent$", "/agent/", "/collections/", "/pay/", "/dev/", "/sign-in", "/compare"],
        },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
