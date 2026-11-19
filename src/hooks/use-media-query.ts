"use client";

import { useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. Returns `false` during server rendering and hydration, so anything
 * gated on it (e.g. the desktop-only search map) is never downloaded or mounted on small screens.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
