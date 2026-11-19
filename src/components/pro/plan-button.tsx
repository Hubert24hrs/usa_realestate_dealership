"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api-client";

/** Posts a billing action and follows the returned redirect (Stripe or the simulated checkout). */
export function PlanButton({ action, plan, children, variant = "default", className }: { action: "upgrade" | "portal" | "downgrade"; plan?: "PRO" | "PREMIER"; children: React.ReactNode; variant?: "default" | "outline" | "ghost"; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await api<{ redirect: string }>("/api/billing", { method: "POST", json: { action, plan } });
        if (!res.ok) {
          setBusy(false);
          return toast.error(apiError(res));
        }
        window.location.assign(res.data.redirect);
      }}
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
