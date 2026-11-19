export const site = {
  name: "CITI VIEW",
  legalName: "CITI VIEW REAL ESTATE",
  tagline: "Homes, rentals, commercial property and land across the USA.",
  description:
    "Search homes for sale, apartments and houses for rent, new construction, commercial real estate and land across the USA, with maps, schools, market data and tools to plan your move.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  demoMode: process.env.NEXT_PUBLIC_SAMPLE_DATA !== "false" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  supportEmail: "support@citiview.example",
} as const;

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const primaryNav: Array<NavItem & { children?: NavItem[] }> = [
  {
    label: "Buy",
    href: "/homes-for-sale",
    children: [
      { label: "Homes for sale", href: "/homes-for-sale", description: "Every active listing on the map" },
      { label: "New construction", href: "/new-construction", description: "Builder homes and communities" },
      { label: "Open houses", href: "/homes-for-sale?openHouse=1", description: "Tour this weekend" },
      { label: "Recently sold", href: "/sold-homes", description: "What homes actually sold for" },
      { label: "Buyer's guide", href: "/learn/home-buying-roadmap", description: "From preapproval to keys" },
    ],
  },
  {
    label: "Rent",
    href: "/apartments-for-rent",
    children: [
      { label: "Apartments for rent", href: "/apartments-for-rent", description: "Communities with live availability" },
      { label: "Houses for rent", href: "/houses-for-rent", description: "Single family rentals" },
      { label: "Rent affordability", href: "/rent/affordability", description: "What rent fits your budget" },
      { label: "Renter dashboard", href: "/account/rentals", description: "Applications, lease and payments" },
      { label: "Avoid rental scams", href: "/learn/avoid-rental-scams", description: "Protect your deposit" },
    ],
  },
  {
    label: "Sell",
    href: "/sell",
    children: [
      { label: "What's my home worth?", href: "/home-value", description: "Estimate from comparable sales" },
      { label: "Find a listing agent", href: "/agents?specialty=listing", description: "Compare local experts" },
      { label: "Post a listing (FSBO)", href: "/sell/post", description: "Sell or rent it yourself" },
      { label: "Seller's guide", href: "/learn/selling-your-home", description: "Prep, price, negotiate" },
    ],
  },
  { label: "New Build", href: "/new-construction" },
  { label: "Commercial", href: "/commercial-real-estate" },
  { label: "Land", href: "/land-for-sale" },
  { label: "Agents", href: "/agents" },
  {
    label: "Mortgage",
    href: "/mortgage",
    children: [
      { label: "Mortgage calculator", href: "/mortgage/calculator", description: "Payment with taxes, insurance, HOA, PMI" },
      { label: "Today's rates", href: "/mortgage/rates", description: "Sample rates by loan type" },
      { label: "Get preapproved", href: "/mortgage/preapproval", description: "Connect with a partner lender" },
      { label: "Affordability", href: "/mortgage/affordability", description: "How much home can you afford?" },
      { label: "Closing costs", href: "/mortgage/closing-costs", description: "Estimate cash to close" },
      { label: "Rent vs. buy", href: "/mortgage/rent-vs-buy", description: "Find your breakeven year" },
    ],
  },
];

export const POPULAR_MARKETS = [
  { name: "Austin, TX", slug: "austin-tx" },
  { name: "Denver, CO", slug: "denver-co" },
  { name: "Nashville, TN", slug: "nashville-tn" },
  { name: "Scottsdale, AZ", slug: "scottsdale-az" },
  { name: "Charlotte, NC", slug: "charlotte-nc" },
  { name: "Raleigh, NC", slug: "raleigh-nc" },
  { name: "Seattle, WA", slug: "seattle-wa" },
  { name: "Miami, FL", slug: "miami-fl" },
  { name: "San Diego, CA", slug: "san-diego-ca" },
  { name: "Atlanta, GA", slug: "atlanta-ga" },
  { name: "Chicago, IL", slug: "chicago-il" },
  { name: "Franklin, TN", slug: "franklin-tn" },
];
