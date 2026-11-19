/** Original CMS content (guides, learn articles, news). */

export interface PostSeed {
  type: "NEWS" | "GUIDE" | "LEARN" | "BLOG";
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  citySlug?: string;
  coverColor: string;
  body: string;
}

export const POSTS: PostSeed[] = [
  {
    type: "GUIDE",
    title: "The home buying roadmap: from preapproval to keys",
    slug: "home-buying-roadmap",
    excerpt: "Eight stages every buyer moves through, what each one costs, and where deals usually stall.",
    tags: ["Buying", "First time buyers"],
    coverColor: "#3b3fa8",
    body: `Buying a home is a sequence of decisions, not a single one. Knowing the order keeps you from paying for things too early, or discovering a deal breaker too late.

## 1. Set a budget you can live with
Lenders approve based on debt to income ratios, but your budget should be based on your life. Add up taxes, insurance, HOA dues and a maintenance reserve (1 to 2% of the price per year) before you settle on a number. Our [mortgage calculator](/mortgage/calculator) and [affordability tool](/mortgage/affordability) show the full monthly picture.

## 2. Get preapproved
A preapproval means a lender has reviewed your income, assets and credit. Sellers take offers far more seriously with one attached. Rate shop with two or three lenders within a two week window so credit inquiries count as one.

## 3. Choose your agent
Interview at least two. Ask how they handle multiple offer situations, how often they will update you, and how they are compensated. Since 2024, buyers sign a written agreement with their agent before touring homes. Read it and negotiate it.

## 4. Search and tour
Save searches with alerts so new listings reach you first. Tour in person or by video, and keep private notes on each home; you will forget details faster than you think.

## 5. Make an offer
Your agent will pull comparable sales. Offers include price, earnest money, contingencies (inspection, appraisal, financing) and a closing date.

## 6. Inspect and appraise
Schedule the inspection immediately. Use the findings to request repairs or credits. The lender's appraisal confirms the price is supported.

## 7. Clear to close
Expect requests for documents. Don't open new credit, change jobs or make big purchases until after closing.

## 8. Close
Review your Closing Disclosure at least three business days before signing. Bring certified funds or wire them, and always confirm wiring instructions by phone with a known number. Wire fraud is the most common closing scam.`,
  },
  {
    type: "GUIDE",
    title: "Selling your home: a step by step plan",
    slug: "selling-your-home",
    excerpt: "How to price, prepare, market and negotiate so you net the most with the fewest surprises.",
    tags: ["Selling"],
    coverColor: "#c98d4a",
    body: `## Price from the market, not the mortgage
Your home is worth what comparable homes have sold for recently, not what you paid or owe. Start with our [home value estimate](/home-value), then have two agents prepare a comparative market analysis.

## Prepare deliberately
Fix what inspectors will flag (leaks, electrical, roof). Declutter, deep clean and paint in neutral tones. Prelisting inspections reduce surprises during negotiation.

## Market well
Professional photography, a floor plan and a 3D tour measurably increase showings. Make sure every photo has accurate alt text and the listing description sticks to the property. Avoid language about who the home is "perfect for", which can violate Fair Housing rules.

## Negotiate the whole offer
Price is one term. Compare financing strength, contingencies, closing timing and requested credits. Ask your agent for a net sheet for each offer.

## Considering For Sale By Owner?
FSBO can save commission, but you take on pricing, disclosures, showings and contract negotiation. You can [post a FSBO listing](/sell/post) on CITI VIEW.`,
  },
  {
    type: "LEARN",
    title: "Closing costs, explained",
    slug: "closing-costs-explained",
    excerpt: "What you pay at the table, who sets each fee, and which ones you can shop for.",
    tags: ["Buying", "Mortgage"],
    coverColor: "#2f6f73",
    body: `Closing costs typically run **2 to 5% of the loan amount** for buyers. They fall into three groups:

## Lender charges
Origination or underwriting fees, discount points (optional, paid to lower your rate), appraisal and credit report fees.

## Third party services
Title search and title insurance, settlement/escrow fee, survey, pest inspection, recording fees. Many of these can be shopped. Your Loan Estimate lists which.

## Prepaids and escrow
Homeowners insurance (first year), prepaid interest through month end, and an initial deposit into your escrow account for taxes and insurance.

## State transfer taxes
Some states and counties charge a transfer or deed tax at sale. Who pays is set by local custom and negotiation.

Use the [closing cost estimator](/mortgage/closing-costs) to model your own numbers.`,
  },
  {
    type: "LEARN",
    title: "How to spot and avoid rental scams",
    slug: "avoid-rental-scams",
    excerpt: "The warning signs of a fake listing, and the habits that protect your deposit.",
    tags: ["Renting", "Safety"],
    coverColor: "#b5543c",
    body: `Rental scams copy real listings, undercut the market and pressure you to pay before you see anything.

## Red flags
- The rent is far below similar homes nearby.
- The "landlord" is out of the country and can't show the home.
- You're asked to pay by wire, gift card, crypto or a payment app before signing a lease.
- They want a deposit to "hold" the home before you've toured it.
- The listing photos appear elsewhere under a different address or name.

## Safe habits
- Tour in person or by live video with the listing contact.
- Verify ownership with the county property records.
- Apply and pay only through a secure platform, like [online applications on CITI VIEW](/rent).
- Never share your Social Security number over email or text.

## Seen something suspicious?
Use **Report listing** on any CITI VIEW listing page. Our moderation team reviews every report.`,
  },
  {
    type: "LEARN",
    title: "Cap rate, NOI and cash on cash: commercial real estate basics",
    slug: "commercial-real-estate-basics",
    excerpt: "The three numbers every investor checks first, with worked examples.",
    tags: ["Commercial", "Investing"],
    coverColor: "#1f2937",
    body: `## Net operating income (NOI)
NOI is gross rental income minus vacancy and operating expenses. It excludes debt service and depreciation.

## Cap rate
Cap rate = NOI ÷ price. A building producing $300,000 NOI offered at $5,000,000 trades at a **6.0% cap**. Lower cap rates usually signal lower perceived risk or higher growth expectations.

## Cash on cash return
Annual pretax cash flow ÷ cash invested. If you put $1.5M down and net $90,000 after debt service, cash on cash is **6%**.

## Lease structures
- **NNN (triple net):** tenant pays taxes, insurance and maintenance on top of base rent.
- **Modified gross:** costs are split.
- **Full service:** landlord covers operating expenses.

Most offering memoranda are confidential. On CITI VIEW you'll sign an NDA before downloading.`,
  },
  {
    type: "LEARN",
    title: "Buying land: water, access, soil and zoning",
    slug: "buying-land-checklist",
    excerpt: "A practical due diligence checklist before you make an offer on acreage.",
    tags: ["Land", "Buying"],
    coverColor: "#6b8f71",
    body: `## Legal access
Confirm deeded access from a public road. "Landlocked" parcels may need an easement you don't have.

## Water
Ask about wells, creeks, ponds and **water rights**. In western states, water rights may be separate from the land.

## Soil and topography
A soil report and perc test determine whether a septic system is possible. Steep slopes raise building costs.

## Zoning and restrictions
Check county zoning, deed restrictions, conservation easements and HOA covenants.

## Utilities
Know the distance to electric service and internet; extending lines can cost thousands per pole.

## Financing
Land loans usually require larger down payments. Agricultural exemptions can dramatically reduce property taxes.`,
  },
  {
    type: "GUIDE",
    title: "Neighborhood guide: Travis Heights, Austin",
    slug: "neighborhood-guide-travis-heights-austin",
    excerpt: "Tree lined streets, creekside trails and a short walk to South Congress.",
    tags: ["Neighborhood guide", "Austin"],
    citySlug: "austin-tx",
    coverColor: "#3b3fa8",
    body: `Travis Heights sits just south of Lady Bird Lake, with rolling streets, midcentury and bungalow era homes and the Blunn Creek greenbelt winding through.

## Getting around
South Congress Avenue's shops and restaurants are a short walk for much of the neighborhood. Downtown is minutes away by bike over the lake.

## Housing
Expect a mix of renovated bungalows, newer modern infill and a handful of small condo buildings. Lots tend to be compact with mature trees.

## Outdoors
Big Stacy Park and its neighborhood pool, Blunn Creek trails and the lake's hike and bike loop.

*Neighborhood guides are sample content created for CITI VIEW.*`,
  },
  {
    type: "GUIDE",
    title: "Neighborhood guide: Highland, Denver",
    slug: "neighborhood-guide-highland-denver",
    excerpt: "Skyline views, Victorian homes and some of Denver's best dining.",
    tags: ["Neighborhood guide", "Denver"],
    citySlug: "denver-co",
    coverColor: "#2f6f73",
    body: `Highland sits on a rise northwest of downtown, connected by pedestrian bridges over Interstate 25 and the South Platte.

## Housing
Victorians and Denver Squares mix with modern duplexes and townhomes. Rooftop decks with skyline views are common in newer builds.

## Daily life
Tennyson Street and 32nd Avenue offer cafés, bakeries and restaurants. Commons Park and the river trail are a short walk.

*Neighborhood guides are sample content created for CITI VIEW.*`,
  },
  {
    type: "NEWS",
    title: "Market update: inventory edges up as rates stabilize",
    slug: "market-update-inventory-rates",
    excerpt: "Illustrative month over month trends across CITI VIEW markets.",
    tags: ["Market update"],
    coverColor: "#41465a",
    body: `> **Sample content.** Figures in this update are generated sample data for the CITI VIEW platform and do not describe the real market.

Across CITI VIEW markets, active inventory rose modestly month over month while median days on market held steady. Sunbelt metros continued to see more new construction supply, and builders offered rate buydowns on a growing share of homes.

Explore live charts on each [city page](/austin-tx) or compare cities with the [cost of living calculator](/rent/cost-of-living).`,
  },
  {
    type: "BLOG",
    title: "Rent vs. buy: how to run the numbers",
    slug: "rent-vs-buy",
    excerpt: "Breakeven years, opportunity cost and the assumptions that change the answer.",
    tags: ["Buying", "Renting"],
    coverColor: "#8e5572",
    body: `Whether buying beats renting depends on **how long you stay**, **how fast prices and rents grow**, and **what your down payment would earn elsewhere**.

## The costs of owning
Mortgage interest, property tax, insurance, HOA dues, maintenance, and the one time costs of buying and later selling.

## The benefits of owning
Principal paydown, appreciation and housing cost stability.

## The costs of renting
Rent and renter's insurance, plus the investment return you keep on cash you didn't put down.

Use our [rent vs. buy calculator](/mortgage/rent-vs-buy) to find your breakeven year.`,
  },
  {
    type: "LEARN",
    title: "Fair Housing: your rights as a buyer or renter",
    slug: "fair-housing-rights",
    excerpt: "What the Fair Housing Act protects, and how to report discrimination.",
    tags: ["Fair Housing", "Renting", "Buying"],
    coverColor: "#3c4a6b",
    body: `The federal **Fair Housing Act** prohibits discrimination in housing because of **race, color, religion, sex (including sexual orientation and gender identity), national origin, familial status and disability**. Many states and cities add protections such as source of income, age or military status.

## What it covers
Advertising, showings, pricing, lending, appraisals, rental terms and reasonable accommodations, including assistance animals for people with disabilities.

## What it means on CITI VIEW
We don't offer filters or listing language based on protected characteristics, and agents and landlords must follow Fair Housing rules. Use **Report listing** if you see discriminatory content.

## Report discrimination
You can file a complaint with HUD's Office of Fair Housing and Equal Opportunity at hud.gov/fairhousing or by calling 1-800-669-9777.`,
  },
];
