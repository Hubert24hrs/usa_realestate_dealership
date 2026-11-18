import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const SETTINGS_TAG = "site-settings";

export interface BrokerageInfo {
  name: string;
  licenses: string[];
  address: string;
  phone: string;
}

export interface SiteSettings {
  idxDisclaimer: string;
  listingDisclaimer: string;
  fairHousing: string;
  demoBanner: string;
  brokerage: BrokerageInfo;
  leadRouting: { strategy: string; preferListingAgent: boolean; slaMinutes: number };
}

const DEFAULTS: SiteSettings = {
  idxDisclaimer:
    "IDX information is provided exclusively for consumers' personal, non-commercial use and may not be used for any purpose other than to identify prospective properties consumers may be interested in purchasing. Information deemed reliable but not guaranteed.",
  listingDisclaimer: "Listing information is deemed reliable but not guaranteed.",
  fairHousing:
    "We are committed to compliance with all federal, state and local fair housing laws and do not discriminate on the basis of any protected characteristic.",
  demoBanner: "You're exploring CITI VIEW demo data — listings, agents and statistics are fictional.",
  brokerage: { name: "CITI VIEW Realty, LLC (placeholder)", licenses: ["License # placeholder"], address: "", phone: "" },
  leadRouting: { strategy: "weighted-round-robin", preferListingAgent: true, slaMinutes: 15 },
};

const KEY_MAP: Record<string, keyof SiteSettings> = {
  "compliance.idxDisclaimer": "idxDisclaimer",
  "compliance.listingDisclaimer": "listingDisclaimer",
  "compliance.fairHousing": "fairHousing",
  "compliance.brokerage": "brokerage",
  "site.demoBanner": "demoBanner",
  "leads.routing": "leadRouting",
};

export const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const rows = await db.siteSetting.findMany();
      const merged: SiteSettings = { ...DEFAULTS };
      for (const row of rows) {
        const key = KEY_MAP[row.key];
        if (key) (merged as unknown as Record<string, unknown>)[key] = row.value;
      }
      return merged;
    } catch {
      return DEFAULTS;
    }
  },
  ["site-settings-v1"],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

export const getStateNotices = unstable_cache(
  async () => {
    try {
      return await db.state.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true, notice: true } });
    } catch {
      return [];
    }
  },
  ["state-notices-v1"],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

export const SETTING_KEYS = Object.keys(KEY_MAP);
