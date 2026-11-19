"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api-client";

export function PayRentButton({ leaseId, label }: { leaseId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await api<{ redirect: string }>("/api/rent/payments", { method: "POST", json: { leaseId } });
        if (!res.ok) {
          setBusy(false);
          toast.error(apiError(res));
          return;
        }
        window.location.assign(res.data.redirect);
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
      {label}
    </Button>
  );
}

export function ApplicationActions({ id, status, slug, demoMode }: { id: string; status: string; slug: string; demoMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = async (action: "withdraw" | "demo-approve") => {
    setBusy(action);
    const res = await api<{ leaseId?: string | null }>(`/api/rent/applications/${id}/${action}`, { method: "POST" });
    setBusy(null);
    setConfirming(false);
    if (!res.ok) return toast.error(apiError(res));
    if (action === "demo-approve" && res.data.leaseId) {
      toast.success("Approved — review and sign your lease");
      router.push(`/account/rentals/lease/${res.data.leaseId}`);
      return;
    }
    toast.success("Application withdrawn");
    router.refresh();
  };

  const open = ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button asChild size="sm"><Link href={`/rent/apply/${slug}?app=${id}`}>Continue application</Link></Button>
      )}
      {demoMode && (status === "SUBMITTED" || status === "UNDER_REVIEW") && (
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("demo-approve")}>
          {busy === "demo-approve" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
          Simulate approval
        </Button>
      )}
      {open &&
        (confirming ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            Withdraw?
            <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => run("withdraw")}>
              {busy === "withdraw" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Yes, withdraw
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Withdraw</Button>
        ))}
    </div>
  );
}
