"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ListingImage } from "@/components/media/listing-image";

export interface CompareItem {
  id: string;
  slug: string;
  title: string;
  price: string;
  photo?: { url: string; alt: string; blurDataUrl: string | null; color: string | null };
}

const KEY = "cv_compare_v1";
const MAX = 4;

interface CompareContextValue {
  items: CompareItem[];
  has: (id: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CompareItem[]);
    } catch {}
  }, []);
  const persist = useCallback((next: CompareItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);
  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      has: (id) => items.some((i) => i.id === id),
      toggle: (item) => {
        if (items.some((i) => i.id === item.id)) return persist(items.filter((i) => i.id !== item.id));
        if (items.length >= MAX) {
          toast.info(`Compare up to ${MAX} homes at a time`);
          return;
        }
        persist([...items, item]);
      },
      remove: (id) => persist(items.filter((i) => i.id !== id)),
      clear: () => persist([]),
    }),
    [items, persist],
  );
  return (
    <CompareContext.Provider value={value}>
      {children}
      <CompareTray />
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue | null {
  return useContext(CompareContext);
}

export function CompareCheckbox({ item }: { item: CompareItem }) {
  const compare = useCompare();
  if (!compare) return null;
  const checked = compare.has(item.id);
  const id = `compare-${item.id}`;
  return (
    <label
      htmlFor={id}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={() => compare.toggle(item)} aria-label={`Compare ${item.title}`} />
      Compare
    </label>
  );
}

function CompareTray() {
  const compare = useContext(CompareContext);
  if (!compare || compare.items.length === 0) return null;
  return (
    <div role="region" aria-label="Homes selected to compare" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border bg-popover p-3 shadow-[var(--shadow-float)]">
      <Scale className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />
      <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {compare.items.map((item) => (
          <li key={item.id} className="relative flex shrink-0 items-center gap-2 rounded-xl border bg-background p-1.5 pr-7">
            <div className="relative size-10 overflow-hidden rounded-lg">
              {item.photo && <ListingImage src={item.photo.url} alt="" blurDataUrl={item.photo.blurDataUrl} color={item.photo.color} fill sizes="40px" />}
            </div>
            <div className="max-w-32">
              <p className="text-xs font-semibold">{item.price}</p>
              <p className="truncate text-[0.7rem] text-muted-foreground">{item.title}</p>
            </div>
            <button type="button" onClick={() => compare.remove(item.id)} className="absolute top-1 right-1 rounded-full p-1 text-muted-foreground hover:bg-accent" aria-label={`Remove ${item.title} from compare`}>
              <X className="size-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="lg" onClick={compare.clear}>Clear</Button>
        <Button asChild size="lg" disabled={compare.items.length < 2}>
          <Link href={`/compare?ids=${compare.items.map((i) => i.id).join(",")}`} aria-disabled={compare.items.length < 2}>
            Compare {compare.items.length}
          </Link>
        </Button>
      </div>
    </div>
  );
}
