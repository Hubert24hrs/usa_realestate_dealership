/**
 * Fair Housing language check for user-written listing copy. Describe the property, not who
 * should live there. "block" findings must be fixed before publishing; "warn" findings are
 * often problematic and come with a suggestion. Not legal advice; housing for older persons
 * (55+/62+) and some other exemptions have their own rules.
 */
export type FhSeverity = "block" | "warn";

export interface FhFinding {
  phrase: string;
  severity: FhSeverity;
  reason: string;
  suggestion?: string;
}

const RULES: Array<{ re: RegExp; severity: FhSeverity; reason: string; suggestion?: string }> = [
  { re: /\b(no|without)\s+(kids|children|child|babies|teenagers|families)\b/i, severity: "block", reason: "Excluding families with children is familial-status discrimination.", suggestion: "Describe the space instead, e.g. “quiet, low-traffic street”." },
  { re: /\badults?\s+only\b|\bno\s+minors\b/i, severity: "block", reason: "Adults-only restrictions are only allowed in qualifying housing for older persons.", suggestion: "If this is a qualifying 55+ community, say “55+ community”." },
  { re: /\b(white|black|asian|hispanic|latino|caucasian|african[- ]american)s?\s+(only|preferred|neighborhood)\b/i, severity: "block", reason: "References to race or national origin are prohibited." },
  { re: /\b(christian|jewish|muslim|catholic|hindu)s?\s+(only|preferred|home|neighborhood|family)\b/i, severity: "block", reason: "Religious preferences are prohibited.", suggestion: "You can mention nearby places of worship as amenities, e.g. “two blocks from St. Mark’s”." },
  { re: /\b(no|not\s+suitable\s+for)\s+(wheelchairs?|disabled|handicapped)\b/i, severity: "block", reason: "Excluding people with disabilities is prohibited.", suggestion: "Describe the access, e.g. “second-floor unit, no elevator”." },
  { re: /\b(ideal|perfect|great)\s+for\s+(singles|a\s+single\s+person|couples|bachelors?|young\s+professionals|students|empty[- ]nesters|retirees|a\s+family)\b/i, severity: "warn", reason: "Saying who the home is “perfect for” implies a preferred type of occupant.", suggestion: "Describe features instead, e.g. “open plan with a home office nook”." },
  { re: /\b(mature|older)\s+(person|persons|tenants?|couple)\b/i, severity: "warn", reason: "Age preferences may violate fair housing rules outside 55+ communities." },
  { re: /\bno\s+(section\s*8|vouchers?|housing\s+assistance)\b/i, severity: "warn", reason: "Many states and cities prohibit refusing renters based on lawful source of income." },
  { re: /\bexclusive\s+neighborhood\b|\bsafe\s+neighborhood\b/i, severity: "warn", reason: "Phrases like “exclusive” or “safe” neighborhood can signal exclusion.", suggestion: "Point to specifics, e.g. “near Zilker Park and two elementary schools”." },
  { re: /\b(english[- ]speaking|must\s+speak\s+english)\b/i, severity: "warn", reason: "Language requirements can amount to national-origin discrimination." },
  { re: /\bable[- ]bodied\b/i, severity: "warn", reason: "May exclude people with disabilities." },
];

export function checkFairHousing(text: string): FhFinding[] {
  const findings: FhFinding[] = [];
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (m) findings.push({ phrase: m[0], severity: rule.severity, reason: rule.reason, suggestion: rule.suggestion });
  }
  return findings;
}

export const hasBlockingFinding = (text: string) => checkFairHousing(text).some((f) => f.severity === "block");
