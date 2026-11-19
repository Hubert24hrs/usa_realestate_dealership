"use client";

import type { ComponentProps } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

type Props = ComponentProps<typeof NextLink>;

/**
 * `next/link` without viewport prefetching. Next's default prefetches every link that scrolls into
 * view — including the JavaScript of those routes — which kept slow phones busy during start-up.
 * This version prefetches on intent instead (hover, focus, touch), so clicks stay fast.
 * Pass `prefetch` explicitly to opt back into Next's behaviour for a specific link.
 */
export default function Link({ prefetch, href, onMouseEnter, onFocus, onTouchStart, ...rest }: Props) {
  const router = useRouter();
  if (prefetch !== undefined) return <NextLink href={href} prefetch={prefetch} onMouseEnter={onMouseEnter} onFocus={onFocus} onTouchStart={onTouchStart} {...rest} />;
  const warm = () => {
    const url = typeof href === "string" ? href : href.pathname ? `${href.pathname}${href.search ?? ""}` : null;
    if (url && url.startsWith("/") && !url.startsWith("//")) router.prefetch(url);
  };
  return (
    <NextLink
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      {...rest}
    />
  );
}
