"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, apiError } from "@/lib/api-client";

export function TourActions({ id, open, address }: { id: string; open: boolean; address: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const cancel = async () => {
    setPending(true);
    const r = await api(`/api/tours/${id}`, { method: "PATCH", json: { action: "cancel" } });
    setPending(false);
    if (!r.ok) return toast.error(apiError(r));
    setConfirming(false);
    toast.success("Tour cancelled — we let the agent know.");
    router.refresh();
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button asChild variant="outline" size="sm">
        <a href={`/api/tours/${id}/ics`} download>
          <CalendarPlus className="size-3.5" aria-hidden /> Add to calendar
        </a>
      </Button>
      {open && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground"><X className="size-3.5" aria-hidden /> Cancel tour</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancel this tour?</DialogTitle>
              <DialogDescription>{address} — the agent will be notified. You can request a new time from the listing page.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep tour</Button>
              <Button variant="destructive" onClick={cancel} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Cancel tour</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
