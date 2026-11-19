import "server-only";
import { createHash } from "node:crypto";

/**
 * Partner-lender integration point for pre-approval requests.
 * Swap `DemoLenderPartner` for a real implementation (e.g. a lender's referral API or a
 * marketplace such as a LOS webhook) by returning it from `getLenderPartner()`.
 */
export interface PreapprovalRequest {
  leadId: string;
  name: string;
  email: string;
  phone?: string | null;
  annualIncome: number;
  purchasePrice: number;
  downPayment: number;
  creditRange: string;
  timeline?: string | null;
}

export interface PreapprovalReceipt {
  partnerId: string;
  partnerName: string;
  reference: string;
  status: "RECEIVED";
  nextSteps: string[];
}

export interface LenderPartner {
  id: string;
  name: string;
  submit(request: PreapprovalRequest): Promise<PreapprovalReceipt>;
}

/** Demo partner: no network calls, deterministic reference, clearly labelled. */
class DemoLenderPartner implements LenderPartner {
  id = "demo-lender";
  name = "Keystone Home Lending (demo partner)";

  async submit(request: PreapprovalRequest): Promise<PreapprovalReceipt> {
    const digest = createHash("sha256").update(`${this.id}:${request.leadId}`).digest("hex").slice(0, 8).toUpperCase();
    return {
      partnerId: this.id,
      partnerName: this.name,
      reference: `CV-PA-${digest}`,
      status: "RECEIVED",
      nextSteps: [
        "A loan officer reviews your details — in a live integration they would reach out within one business day.",
        "Gather two recent pay stubs, two years of W-2s or tax returns, two months of bank statements and a photo ID.",
        "The lender verifies income and assets and runs a credit check with your permission, then issues a pre-approval letter.",
      ],
    };
  }
}

export function getLenderPartner(): LenderPartner {
  // Only the demo partner ships today; add real partners behind LENDER_PARTNER=<id>.
  return new DemoLenderPartner();
}
