import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const FLAGS = [
  "You're asked to wire money, pay with gift cards or crypto, or pay before seeing the home.",
  "The rent is far below similar homes nearby, or the \"owner\" is suddenly out of the country.",
  "No lease, no application, or pressure to decide in minutes.",
  "The contact won't meet in person or show ID that matches public property records.",
];

/** Rental-scam red flags with a link to the full guide. */
export function ScamCallout({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <aside aria-labelledby="scam-title" className={cn("rounded-3xl border border-warning/40 bg-warning/10 p-5", className)}>
      <p id="scam-title" className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="size-5 text-warning-foreground dark:text-warning" aria-hidden /> Rental scam red flags
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        {(compact ? FLAGS.slice(0, 2) : FLAGS).map((f) => <li key={f}>{f}</li>)}
      </ul>
      <p className="mt-3 text-sm">
        On CITI VIEW you only pay through your secure renter dashboard.{" "}
        <Link href="/learn/avoid-rental-scams" className="font-medium text-primary hover:underline">How to avoid rental scams</Link>
      </p>
    </aside>
  );
}
