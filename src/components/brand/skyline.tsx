import { cn } from "@/lib/utils";

/**
 * Decorative hero skyline (original artwork). Drawn from two static SVGs in /public/brand instead
 * of ~300 inline elements, so it adds nothing to hydration: the towers are a mask filled with the
 * current text color (theme-aware), the lit windows a plain image.
 */
export function SkylineBackdrop({ className }: { className?: string }) {
  const mask = "url(/brand/skyline-towers.svg)";
  return (
    <div aria-hidden className={cn("overflow-hidden", className)}>
      <div className="absolute inset-0 bg-current" style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: "cover", WebkitMaskSize: "cover", maskPosition: "center bottom", WebkitMaskPosition: "center bottom", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- static decorative SVG; next/image adds nothing here */}
      <img src="/brand/skyline-windows.svg" alt="" decoding="async" fetchPriority="low" className="absolute inset-0 h-full w-full object-cover object-bottom" />
    </div>
  );
}
