"use client";

import { useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, Hash, Home, Landmark, Loader2, MapPin, Search, UserRound } from "lucide-react";
import { useDebounced } from "@/hooks/use-debounced";
import type { Suggestion, SuggestionType } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const ICONS: Record<SuggestionType, React.ComponentType<{ className?: string }>> = {
  city: Building2,
  neighborhood: MapPin,
  zip: Hash,
  state: Landmark,
  school: GraduationCap,
  address: Home,
  mls: Hash,
  agent: UserRound,
};

const TYPE_LABEL: Record<SuggestionType, string> = {
  city: "City",
  neighborhood: "Neighborhood",
  zip: "ZIP code",
  state: "State",
  school: "School",
  address: "Address",
  mls: "MLS #",
  agent: "Agent",
};

export async function fetchSuggestions(q: string): Promise<Suggestion[]> {
  const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return ((await res.json()) as { suggestions: Suggestion[] }).suggestions;
}

interface Props {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSelect: (suggestion: Suggestion) => void;
  /** Called when the user submits free text without picking a suggestion. */
  onSubmitText?: (text: string, firstSuggestion?: Suggestion) => void;
}

/** ARIA 1.2 combobox with list autocomplete. */
export function LocationSearch({ defaultValue = "", placeholder = "City, neighborhood, ZIP, address, school, MLS # or agent", label = "Search location", size = "md", className, inputClassName, autoFocus, onSelect, onSubmitText }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const debounced = useDebounced(value.trim(), 160);
  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: () => fetchSuggestions(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const show = open && value.trim().length >= 2;

  const choose = (s: Suggestion) => {
    setValue(s.type === "neighborhood" ? `${s.label}, ${s.sublabel?.split("· ")[1] ?? ""}`.replace(/, $/, "") : s.label);
    setOpen(false);
    setActive(-1);
    onSelect(s);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(suggestions.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) choose(suggestions[active]!);
      else if (value.trim()) {
        setOpen(false);
        onSubmitText?.(value.trim(), suggestions.find((s) => s.place) ?? suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        {label}
      </label>
      <Search className={cn("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground", size === "lg" ? "size-5" : "size-4")} aria-hidden />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full rounded-xl border border-input bg-background pr-10 text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          size === "lg" ? "h-14 pl-11 text-base" : "h-10 pl-10 text-sm",
          inputClassName,
        )}
      />
      {isFetching && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      <ul
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!show || suggestions.length === 0}
        className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-float)]"
      >
        {suggestions.map((s, i) => {
          const Icon = ICONS[s.type];
          return (
            <li
              key={`${s.type}-${s.label}-${s.place ?? s.href}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2", i === active && "bg-accent")}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.label}</span>
                {s.sublabel && <span className="block truncate text-xs text-muted-foreground">{s.sublabel}</span>}
              </span>
              <span className="shrink-0 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{TYPE_LABEL[s.type]}</span>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {show && !isFetching ? `${suggestions.length} suggestions available` : ""}
      </p>
    </div>
  );
}
