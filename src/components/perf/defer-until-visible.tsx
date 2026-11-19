"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mount heavy, below-the-fold client widgets (charts, maps, calculators, listing rails) only when
 * they're about to scroll into view. Until then the server renders `fallback` — give it the final
 * height so nothing shifts, and keep headings in it so the page outline stays complete.
 * Moving keyboard focus into the placeholder also mounts the content.
 */
export function DeferUntilVisible({ children, fallback, rootMargin = "400px", minHeight }: { children: React.ReactNode; fallback?: React.ReactNode; rootMargin?: string; minHeight?: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;
  return (
    <div ref={ref} onFocusCapture={() => setVisible(true)} style={minHeight != null ? { minHeight } : undefined}>
      {fallback}
    </div>
  );
}
