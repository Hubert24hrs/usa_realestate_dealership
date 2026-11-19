"use client";

import dynamic from "next/dynamic";

/**
 * Client-only, code-split versions of heavy below-the-fold widgets. Paired with
 * <DeferUntilVisible>, their JavaScript is neither downloaded nor evaluated until the section
 * approaches the viewport (a static import would still run the module at start-up).
 */
export const LazyPaymentCalculator = dynamic(() => import("@/components/listing/payment-calculator").then((m) => m.PaymentCalculator), { ssr: false });
export const LazyAffordabilityCheck = dynamic(() => import("@/components/listing/affordability-check").then((m) => m.AffordabilityCheck), { ssr: false });
export const LazyPriceHistoryChart = dynamic(() => import("@/components/charts/price-history-chart").then((m) => m.PriceHistoryChart), { ssr: false });
export const LazyCommuteCalculator = dynamic(() => import("@/components/listing/commute-calculator").then((m) => m.CommuteCalculator), { ssr: false });
export const LazyContactCard = dynamic(() => import("@/components/listing/contact-card").then((m) => m.ContactCard), { ssr: false });
export const LazyMarketSnapshot = dynamic(() => import("@/components/home/market-snapshot").then((m) => m.MarketSnapshot), { ssr: false });
export const LazyPersonalRails = dynamic(() => import("@/components/home/personal-rails").then((m) => m.PersonalRails), { ssr: false });
