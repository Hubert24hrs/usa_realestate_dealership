/** Cookie-consent state (CCPA/CPRA + GDPR). Client-safe; no server imports. */

export const CONSENT_COOKIE = "cv_consent";
export const CONSENT_VERSION = 1;
export const OPEN_PREFERENCES_EVENT = "cv:open-cookie-preferences";

export interface ConsentState {
  v: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** CCPA "sale/share" opt-out (also set automatically by Global Privacy Control). */
  doNotSell: boolean;
  ts: string;
}

export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as ConsentState;
    return value.v === CONSENT_VERSION ? value : null;
  } catch {
    return null;
  }
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}

export function writeConsent(state: Omit<ConsentState, "v" | "necessary" | "ts">): ConsentState {
  const full: ConsentState = { v: CONSENT_VERSION, necessary: true, ts: new Date().toISOString(), ...state };
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(full))}; Max-Age=${maxAge}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new CustomEvent("cv:consent-changed", { detail: full }));
  return full;
}

export function hasConsent(kind: "analytics" | "marketing"): boolean {
  const state = readConsent();
  return Boolean(state?.[kind]);
}

export function globalPrivacyControl(): boolean {
  return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}
