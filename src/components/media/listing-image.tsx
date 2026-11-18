"use client";

import Image, { type ImageProps } from "next/image";
import { isSvg, pickLoader } from "@/lib/media/loader";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "src" | "placeholder" | "blurDataURL" | "loader" | "alt" | "color"> & {
  src: string;
  alt: string;
  blurDataUrl?: string | null;
  color?: string | null;
};

/** next/image wrapper: picks a CDN loader, blur placeholder, and skips optimisation for SVG illustrations. */
export function ListingImage({ src, alt, blurDataUrl, color, className, style, ...props }: Props) {
  const svg = isSvg(src);
  return (
    <Image
      src={src}
      alt={alt}
      loader={svg ? undefined : pickLoader(src)}
      unoptimized={svg}
      placeholder={blurDataUrl && !svg ? "blur" : "empty"}
      blurDataURL={blurDataUrl ?? undefined}
      className={cn("bg-muted object-cover", className)}
      style={{ backgroundColor: color ?? undefined, ...style }}
      {...props}
    />
  );
}
