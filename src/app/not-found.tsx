import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6 py-24 text-center">
      <div>
        <LogoMark className="mx-auto size-14" />
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-2 font-display text-display-md font-semibold">We couldn&apos;t find that page</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">The listing may have sold or been removed, or the link has a typo. Try a new search instead.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Go home</Link>
          <Link href="/homes-for-sale" className="rounded-xl border px-5 py-2.5 text-sm font-semibold">Search homes</Link>
        </div>
      </div>
    </main>
  );
}
