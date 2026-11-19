"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Loader2, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ListingImage } from "@/components/media/listing-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { formatTime, initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ConversationView {
  id: string;
  subject: string | null;
  listing: { slug: string; streetAddress: string; city: string; state: string; communityName: string | null; media: Array<{ url: string; alt: string; blurDataUrl: string | null; color: string | null }> } | null;
  others: Array<{ id: string; name: string | null; role: string }>;
  last: { body: string; createdAt: string; mine: boolean } | null;
  unread: boolean;
  updatedAt: string;
}

interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  sender: string | null;
  pending?: boolean;
}

const ROLE_LABEL: Record<string, string> = { AGENT: "Agent", BROKER: "Broker", PROPERTY_MANAGER: "Property manager", ADMIN: "CITI VIEW team" };

function titleOf(c: ConversationView) {
  return c.others.map((o) => o.name ?? "CITI VIEW member").join(", ") || "Conversation";
}

export function MessagesInbox({ initial, initialId }: { initial: ConversationView[]; initialId: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(initialId && initial.some((c) => c.id === initialId) ? initialId : null);
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const r = await api<{ conversations: ConversationView[] }>("/api/messages");
      if (!r.ok) throw new Error(apiError(r));
      return r.data.conversations;
    },
    initialData: initial,
    refetchInterval: 30_000,
  });
  const list = conversations.data ?? [];
  const active = list.find((c) => c.id === activeId) ?? null;

  const select = (id: string | null) => {
    setActiveId(id);
    router.replace(id ? `/account/messages?c=${id}` : "/account/messages", { scroll: false });
  };

  if (!list.length) {
    return (
      <div className="grid place-items-center rounded-3xl border border-dashed bg-surface px-6 py-16 text-center">
        <Inbox className="size-10 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 font-display text-lg font-semibold">No messages yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Questions you send agents from a listing page show up here, along with their replies.</p>
        <Button asChild className="mt-5"><Link href="/homes-for-sale">Browse homes</Link></Button>
      </div>
    );
  }

  return (
    <div className="grid h-[min(720px,calc(100dvh-13rem))] min-h-[480px] grid-cols-1 overflow-hidden rounded-3xl border bg-surface md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className={cn("min-h-0 flex-col border-r md:flex", active ? "hidden" : "flex")}>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto" aria-label="Conversations">
          {list.map((c) => {
            const cover = c.listing?.media[0];
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/60", c.id === activeId && "bg-muted")}
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {cover ? <ListingImage src={cover.url} alt="" blurDataUrl={cover.blurDataUrl} color={cover.color} fill sizes="44px" /> : <span className="grid size-full place-items-center text-xs font-semibold">{initials(titleOf(c))}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{titleOf(c)}</span>
                      {c.last && <time dateTime={c.last.createdAt} suppressHydrationWarning className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.last.createdAt)}</time>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.listing ? c.listing.communityName ?? c.listing.streetAddress : c.subject ?? ""}</span>
                    {c.last && <span className={cn("mt-0.5 block truncate text-sm", c.unread ? "text-foreground" : "text-muted-foreground")}>{c.last.mine ? "You: " : ""}{c.last.body}</span>}
                  </span>
                  {c.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-copper-500" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {active ? (
        <Thread key={active.id} conversation={active} onBack={() => select(null)} onRead={() => {
          qc.setQueryData<ConversationView[]>(["conversations"], (l) => l?.map((c) => (c.id === active.id ? { ...c, unread: false } : c)));
          void qc.invalidateQueries({ queryKey: ["me"] });
        }} />
      ) : (
        <div className="hidden place-items-center p-8 text-center text-sm text-muted-foreground md:grid">Select a conversation</div>
      )}
    </div>
  );
}

function Thread({ conversation, onBack, onRead }: { conversation: ConversationView; onBack: () => void; onRead: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const key = ["thread", conversation.id];
  const thread = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await api<{ messages: ThreadMessage[] }>(`/api/messages/${conversation.id}`);
      if (!r.ok) throw new Error(apiError(r));
      return r.data.messages;
    },
    refetchInterval: 10_000,
  });
  const messages = thread.data ?? [];

  useEffect(() => {
    if (thread.isSuccess && conversation.unread) onRead();
  }, [thread.isSuccess, conversation.unread, onRead]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: ThreadMessage = { id: `tmp-${Date.now()}`, body, createdAt: new Date().toISOString(), mine: true, sender: null, pending: true };
    qc.setQueryData<ThreadMessage[]>(key, (l) => [...(l ?? []), optimistic]);
    setDraft("");
    const r = await api(`/api/messages/${conversation.id}`, { method: "POST", json: { body } });
    setSending(false);
    if (!r.ok) {
      qc.setQueryData<ThreadMessage[]>(key, (l) => l?.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      return toast.error(apiError(r));
    }
    await Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["conversations"] })]);
  };

  const other = conversation.others[0];
  return (
    <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${titleOf(conversation)}`}>
      <header className="flex items-center gap-3 border-b p-3 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to conversations"><ArrowLeft className="size-4" aria-hidden /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{titleOf(conversation)}{other && ROLE_LABEL[other.role] && <span className="font-normal text-muted-foreground"> · {ROLE_LABEL[other.role]}</span>}</p>
          {conversation.listing ? (
            <Link href={`/property/${conversation.listing.slug}`} className="block truncate text-xs text-primary hover:underline">
              {conversation.listing.communityName ?? conversation.listing.streetAddress}, {conversation.listing.city}, {conversation.listing.state}
            </Link>
          ) : (
            conversation.subject && <p className="truncate text-xs text-muted-foreground">{conversation.subject}</p>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-busy={thread.isLoading}>
        {thread.isLoading && <div className="grid h-full place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading messages" /></div>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "rounded-br-md bg-brand-700 text-white dark:bg-brand-500 dark:text-brand-950" : "rounded-bl-md bg-muted", m.pending && "opacity-70")}>
              <p className="whitespace-pre-line break-words">{m.body}</p>
              <p className={cn("mt-1 text-[0.7rem]", m.mine ? "text-white/75 dark:text-brand-950/70" : "text-muted-foreground")}>
                {!m.mine && m.sender ? `${m.sender} · ` : ""}
                <time dateTime={m.createdAt}>{m.pending ? "Sending…" : `${timeAgo(m.createdAt)} · ${formatTime(m.createdAt)}`}</time>
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="flex items-end gap-2 border-t p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="composer" className="sr-only">Message</label>
        <Textarea
          id="composer"
          rows={1}
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Write a message — Enter to send, Shift+Enter for a new line"
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={!draft.trim() || sending} aria-label="Send message">
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <SendHorizontal className="size-4" aria-hidden />}
        </Button>
      </form>
    </section>
  );
}
