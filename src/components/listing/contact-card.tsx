"use client";

import { useMemo, useState } from "react";
import Link from "@/components/app-link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, CheckCircle2, Loader2, MessageCircleQuestion, Phone, Send, Video, Footprints, HandCoins, Info } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TCPA_TEXT } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";

type Mode = "TOUR" | "REQUEST_INFO" | "ASK_AGENT" | "OFFER_INTEREST";

export interface ContactAgent {
  name: string;
  slug: string;
  title: string | null;
  phone: string | null;
  brandColor: string | null;
  organization: string | null;
  licenseNumber: string | null;
  rating: number;
  reviewCount: number;
}

const FormSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).regex(/^[+()\d\s.-]*$/, "Use digits only").optional(),
  message: z.string().max(2000).optional(),
  consent: z.boolean().refine((v) => v, "Please agree to be contacted"),
  website: z.string().optional(),
  offerAmount: z.string().optional(),
  financing: z.string().optional(),
  preApproved: z.string().optional(),
  timeline: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

function nextDays(n: number) {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 1; days.length < n; i++) {
    const day = new Date(d.getTime() + i * 86_400_000);
    days.push(day);
  }
  return days;
}
const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];

export function ContactCard({
  listingId,
  listingTitle,
  price,
  agent,
  isFsbo,
  variant,
  applyHref,
}: {
  listingId: string;
  listingTitle: string;
  price: number;
  agent: ContactAgent | null;
  isFsbo: boolean;
  variant: "sale" | "rent" | "commercial" | "land" | "sold";
  applyHref?: string;
}) {
  const modes: Array<{ id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "TOUR", label: variant === "land" ? "Site visit" : "Tour", icon: CalendarCheck },
    { id: "REQUEST_INFO", label: "Info", icon: Info },
    { id: "ASK_AGENT", label: isFsbo ? "Ask owner" : "Ask", icon: MessageCircleQuestion },
    ...(variant === "sale" || variant === "land" ? [{ id: "OFFER_INTEREST" as Mode, label: "Offer", icon: HandCoins }] : []),
  ];
  const [mode, setMode] = useState<Mode>(variant === "sold" ? "REQUEST_INFO" : "TOUR");
  const [tourType, setTourType] = useState<"IN_PERSON" | "VIDEO">("IN_PERSON");
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(days[0]!.toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00 AM");
  const [done, setDone] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { name: "", email: "", phone: "", message: "", consent: false, offerAmount: String(price), financing: "Conventional", preApproved: "yes", timeline: "30 days" } });
  const { register, handleSubmit, formState, setValue, watch } = form;

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const base = { listingId, name: values.name, email: values.email, phone: values.phone, message: values.message, consent: true as const, website: values.website, source: typeof window !== "undefined" ? window.location.pathname : undefined };
    const payload =
      mode === "TOUR"
        ? { ...base, type: "TOUR", tourType, preferredDate: day, preferredTime: time }
        : mode === "OFFER_INTEREST"
          ? { ...base, type: "OFFER_INTEREST", offerAmount: Number(values.offerAmount?.replace(/[^\d]/g, "")), financing: values.financing, preApproved: values.preApproved, timeline: values.timeline }
          : { ...base, type: mode, message: values.message || (mode === "REQUEST_INFO" ? `I'd like more information about ${listingTitle}.` : "") };
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ message: string }> };
      setServerError(err.issues?.[0]?.message ?? err.error ?? "Something went wrong. Please try again.");
      return;
    }
    const data = (await res.json()) as { routedTo?: string | null; conversationId?: string | null };
    setConversationId(data.conversationId ?? null);
    setDone(mode === "TOUR" ? `Tour requested for ${new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${time}.` : `Sent! ${data.routedTo ?? "An agent"} will reply soon.`);
  });

  const contactName = isFsbo ? "the owner" : agent?.name ?? "a local agent";

  return (
    <aside aria-label="Contact" className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-raised)]">
      {done ? (
        <div className="py-6 text-center" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">Request sent</h2>
          <p className="mt-1 text-sm text-muted-foreground">{done} We emailed you a confirmation.</p>
          {conversationId && (
            <Button asChild className="mt-4 w-full"><Link href={`/account/messages?c=${conversationId}`}>Continue in Messages</Link></Button>
          )}
          <Button variant="outline" className="mt-4" onClick={() => { setDone(null); setConversationId(null); form.reset({ ...form.getValues(), message: "" }); }}>Send another</Button>
        </div>
      ) : (
        <>
          {variant === "rent" && applyHref && (
            <Button asChild size="lg" className="mb-4 h-11 w-full text-base"><Link href={applyHref}>Apply online</Link></Button>
          )}
          <div role="tablist" aria-label="How would you like to connect?" className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0,1fr))` }}>
            {modes.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" type="button" aria-selected={mode === id} onClick={() => setMode(id)} className={cn("flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold transition-colors", mode === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            {mode === "TOUR" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {([["IN_PERSON", "In person", Footprints], ["VIDEO", "Video chat", Video]] as const).map(([id, label, Icon]) => (
                    <button key={id} type="button" aria-pressed={tourType === id} onClick={() => setTourType(id)} className={cn("flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium", tourType === id ? "border-primary bg-accent text-accent-foreground" : "hover:bg-accent/60")}>
                      <Icon className="size-4" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
                <fieldset className="min-w-0">
                  <legend className="mb-1.5 text-sm font-medium">Choose a day</legend>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {days.map((d) => {
                      const value = d.toISOString().slice(0, 10);
                      return (
                        <button key={value} type="button" aria-pressed={day === value} onClick={() => setDay(value)} className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5", day === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
                          <span className="text-[0.65rem] font-semibold uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                          <span className="text-lg leading-tight font-semibold">{d.getDate()}</span>
                          <span className="text-[0.65rem]">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-time">Time</Label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger id="cc-time" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {mode === "OFFER_INTEREST" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="cc-offer">Offer amount</Label>
                  <Input id="cc-offer" inputMode="numeric" {...register("offerAmount")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-fin">Financing</Label>
                  <Select value={watch("financing")} onValueChange={(v) => setValue("financing", v)}>
                    <SelectTrigger id="cc-fin" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Cash", "Conventional", "FHA", "VA", "USDA", "Other"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-pre">Preapproved?</Label>
                  <Select value={watch("preApproved")} onValueChange={(v) => setValue("preApproved", v)}>
                    <SelectTrigger id="cc-pre" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="in-progress">In progress</SelectItem><SelectItem value="no">Not yet</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="cc-tl">Timeline to close</Label>
                  <Select value={watch("timeline")} onValueChange={(v) => setValue("timeline", v)}>
                    <SelectTrigger id="cc-tl" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["ASAP", "30 days", "60 days", "90+ days"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">This shares your interest. It isn&apos;t a binding offer. {contactName === "the owner" ? "The owner" : "Your agent"} will follow up on next steps.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="cc-name">Name</Label>
                <Input id="cc-name" autoComplete="name" aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
                {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="cc-email">Email</Label>
                <Input id="cc-email" type="email" autoComplete="email" aria-invalid={Boolean(formState.errors.email)} {...register("email")} />
                {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="cc-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="cc-phone" type="tel" autoComplete="tel" aria-invalid={Boolean(formState.errors.phone)} {...register("phone")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cc-msg">{mode === "ASK_AGENT" ? "Your question" : "Message"} <span className="font-normal text-muted-foreground">{mode === "ASK_AGENT" ? "" : "(optional)"}</span></Label>
              <Textarea id="cc-msg" rows={3} placeholder={mode === "ASK_AGENT" ? "e.g. How old is the roof? Are there HOA special assessments?" : `I'm interested in ${listingTitle}.`} {...register("message")} />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={watch("consent")} onCheckedChange={(v) => setValue("consent", v === true, { shouldValidate: formState.isSubmitted })} aria-invalid={Boolean(formState.errors.consent)} className="mt-0.5" />
              <span>{TCPA_TEXT}</span>
            </label>
            {formState.errors.consent && <p className="text-xs text-destructive">{formState.errors.consent.message}</p>}
            {serverError && <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{serverError}</p>}
            <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {mode === "TOUR" ? "Request tour" : mode === "OFFER_INTEREST" ? "Share offer interest" : "Send"}
            </Button>
          </form>
        </>
      )}

      <div className="mt-5 border-t pt-4">
        {isFsbo ? (
          <p className="text-sm"><span className="font-semibold">For sale by owner.</span> <span className="text-muted-foreground">Messages go directly to the owner. CITI VIEW doesn&apos;t represent either party.</span></p>
        ) : agent ? (
          <div className="flex items-center gap-3">
            <AgentAvatar name={agent.name} color={agent.brandColor} />
            <div className="min-w-0 flex-1">
              <Link href={`/agents/${agent.slug}`} className="block truncate font-semibold hover:underline">{agent.name}</Link>
              <p className="truncate text-xs text-muted-foreground">{agent.title} · {agent.organization}</p>
              <p className="text-xs text-muted-foreground">★ {agent.rating.toFixed(1)} ({agent.reviewCount}) · {agent.licenseNumber}</p>
            </div>
            {agent.phone && (
              <Button asChild variant="outline" size="icon-lg" className="rounded-full" aria-label={`Call ${agent.name}`}>
                <a href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`}><Phone className="size-4" aria-hidden /></a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">A CITI VIEW partner agent will respond.</p>
        )}
      </div>
    </aside>
  );
}
