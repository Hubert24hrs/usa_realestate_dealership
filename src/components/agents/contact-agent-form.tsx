"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { api, apiError } from "@/lib/api-client";
import { TCPA_TEXT } from "@/lib/validation/lead";

/** Contact a specific agent — the lead routes straight to them (no round-robin). */
export function ContactAgentForm({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { data: me } = useMe();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = agentName.split(" ")[0];

  useEffect(() => {
    if (me?.user) {
      setName((n) => n || me.user!.name || "");
      setEmail((e) => e || me.user!.email || "");
    }
  }, [me?.user]);

  if (state === "sent") {
    return (
      <div role="status" className="rounded-3xl border bg-card p-5">
        <CheckCircle2 className="size-7 text-success" aria-hidden />
        <p className="mt-2 font-semibold">Message sent to {first}</p>
        <p className="mt-1 text-sm text-muted-foreground">You&apos;ll get a reply by email{conversationId ? " — and you can continue the conversation in Messages" : ""}.</p>
        {conversationId && <Button asChild size="sm" className="mt-3"><Link href="/account/messages">Open Messages</Link></Button>}
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-3xl border bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (!consent) return setError("Please agree to be contacted.");
        setState("sending");
        setError(null);
        const res = await api<{ conversationId?: string | null }>("/api/leads", {
          method: "POST",
          json: { type: "CONTACT_AGENT", agentId, name, email, phone: f.get("phone") ?? "", message: f.get("message") ?? "", consent: true, website: f.get("website") ?? "", source: typeof window !== "undefined" ? window.location.pathname : undefined },
        });
        if (!res.ok) {
          setState("idle");
          return setError(apiError(res));
        }
        setConversationId(res.data.conversationId ?? null);
        setState("sent");
      }}
    >
      <p className="font-semibold">Contact {first}</p>
      <div className="space-y-1.5"><Label htmlFor="ca-name">Name</Label><Input id="ca-name" required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="ca-email">Email</Label><Input id="ca-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="ca-phone">Phone (optional)</Label><Input id="ca-phone" name="phone" type="tel" autoComplete="tel" /></div>
      <div className="space-y-1.5">
        <Label htmlFor="ca-msg">Message</Label>
        <Textarea id="ca-msg" name="message" rows={3} maxLength={2000} defaultValue={`Hi ${first}, I'd like to talk about buying or selling a home.`} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label htmlFor="ca-consent" className="flex items-start gap-2.5 text-xs text-muted-foreground">
        <Checkbox id="ca-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>{TCPA_TEXT}</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Send message
      </Button>
    </form>
  );
}
