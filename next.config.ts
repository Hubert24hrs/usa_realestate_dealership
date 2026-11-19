import path from "node:path";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Pin the workspace root to this project (a stray lockfile higher up would otherwise be picked).
const projectRoot = path.resolve(__dirname);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self \"https://js.stripe.com\")" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

// Licensed MLS photo CDNs (comma-separated hostnames; wildcards like *.cdn.example.com work). Read at build time.
const feedMediaHosts = (process.env.RESO_MEDIA_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter((h) => /^[a-z0-9*.-]+$/i.test(h));

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets a production build run alongside `next dev` without clobbering .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2_678_400,
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 400],
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      ...feedMediaHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
