"use client";

import { useState } from "react";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { NumberField, ResultStat } from "@/components/tools/fields";
import { formatMoney } from "@/lib/format";

export function NetProceedsCalculator({ defaultPrice }: { defaultPrice: number }) {
  const [price, setPrice] = useState(defaultPrice);
  const [payoff, setPayoff] = useState(Math.round(defaultPrice * 0.45));
  const [listingPct, setListingPct] = useState(2.5);
  const [buyerPct, setBuyerPct] = useState(2.5);
  const [closingPct, setClosingPct] = useState(1.5);
  const [concessions, setConcessions] = useState(5_000);

  const listing = (price * listingPct) / 100;
  const buyer = (price * buyerPct) / 100;
  const closing = (price * closingPct) / 100;
  const net = price - payoff - listing - buyer - closing - concessions;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-3xl border bg-card p-5">
        <NumberField label="Expected sale price" kind="money" value={price} onChange={setPrice} max={100_000_000} />
        <NumberField label="Mortgage payoff & liens" kind="money" value={payoff} onChange={setPayoff} max={100_000_000} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Listing agent" kind="percent" value={listingPct} onChange={setListingPct} max={10} decimals={2} />
          <NumberField label="Buyer's agent" kind="percent" value={buyerPct} onChange={setBuyerPct} max={10} decimals={2} help="If you offer it" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Closing costs" kind="percent" value={closingPct} onChange={setClosingPct} max={10} decimals={2} help="Title, transfer tax, escrow" />
          <NumberField label="Repairs & credits" kind="money" value={concessions} onChange={setConcessions} max={10_000_000} />
        </div>
      </div>
      <div className="min-w-0 space-y-4">
        <ResultStat tone="primary" label="Estimated net proceeds" value={formatMoney(net)} sub={`${price > 0 ? Math.round((net / price) * 100) : 0}% of the sale price`} />
        <div className="rounded-3xl border bg-card p-5">
          <SegmentedBar
            ariaLabel="Where the sale price goes"
            format={(v) => formatMoney(v)}
            segments={[
              { key: "net", label: "You keep", value: Math.max(0, net), color: "var(--series-1)" },
              { key: "payoff", label: "Mortgage payoff", value: payoff, color: "var(--series-2)" },
              { key: "agents", label: "Agent compensation", value: listing + buyer, color: "var(--series-3)", ink: "dark" },
              { key: "costs", label: "Closing costs & credits", value: closing + concessions, color: "var(--series-4)", ink: "dark" },
            ]}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            Commissions are negotiable and aren&apos;t set by law. Since 2024, buyer-agent compensation is negotiated separately and isn&apos;t offered through the MLS — you can choose whether to offer it. Selling FSBO avoids the listing commission.
          </p>
        </div>
      </div>
    </div>
  );
}
