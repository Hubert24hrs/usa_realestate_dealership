"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarCheck, CheckCheck, FileText, FolderHeart, Inbox, Info, TrendingDown, UserRound, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  ago: string;
  createdAt: string;
}

const ICONS: Record<string, LucideIcon> = {
  ALERT_MATCH: BellRing,
  PRICE_DROP: TrendingDown,
  TOUR_UPDATE: CalendarCheck,
  MESSAGE: Inbox,
  APPLICATION_UPDATE: FileText,
  LEAD: UserRound,
  COLLECTION: FolderHeart,
  SYSTEM: Info,
};

const safeHref = (url: string | null) => (url && url.startsWith("/") && !url.startsWith("//") ? url : null);

export function NotificationsList({ items }: { items: NotificationView[] }) {
  const qc = useQueryClient();
  const [list, setList] = useState(items);
  const unread = list.filter((n) => !n.read).length;

  const markAll = async () => {
    const r = await api("/api/notifications", { method: "PATCH", json: { all: true } });
    if (!r.ok) return toast.error(apiError(r));
    setList((l) => l.map((n) => ({ ...n, read: true })));
    void qc.invalidateQueries({ queryKey: ["me"] });
  };
  const markOne = (id: string) => {
    setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }), keepalive: true }).then(() => qc.invalidateQueries({ queryKey: ["me"] }));
  };

  const groups: Array<[string, NotificationView[]]> = [
    ["New", list.filter((n) => !n.read)],
    ["Earlier", list.filter((n) => n.read)],
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">{unread ? `${unread} unread` : "You're all caught up"}</p>
        <Button variant="outline" size="lg" className="rounded-full" onClick={markAll} disabled={!unread}>
          <CheckCheck className="size-4" aria-hidden /> Mark all as read
        </Button>
      </div>
      {groups.map(([label, group]) =>
        group.length ? (
          <section key={label} aria-label={label} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h2>
            <ul className="divide-y overflow-hidden rounded-3xl border bg-surface">
              {group.map((n) => {
                const Icon = ICONS[n.type] ?? Info;
                const href = safeHref(n.url);
                const content = (
                  <>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", n.read ? "bg-muted text-muted-foreground" : "bg-copper-100 text-copper-700")}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", !n.read && "font-semibold")}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{n.body}</span>}
                      <time dateTime={n.createdAt} className="mt-1 block text-xs text-muted-foreground">{n.ago}</time>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-copper-500" aria-label="Unread" />}
                  </>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link href={href} onClick={() => !n.read && markOne(n.id)} className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                        {content}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 p-4">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
