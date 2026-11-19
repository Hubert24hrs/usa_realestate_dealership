/**
 * Demo geography. City/neighborhood names and approximate coordinates are real
 * public place names; every statistic, boundary, school and listing attached to
 * them is DEMO DATA generated for CITI VIEW and must not be relied upon.
 */

export interface StateSeed {
  code: string;
  name: string;
  notice: string;
}

export const STATES: StateSeed[] = [
  {
    code: "TX",
    name: "Texas",
    notice:
      "Texas law requires all real estate license holders to give the Information About Brokerage Services form (IABS) to prospective clients, and to post the TREC Consumer Protection Notice. [Placeholder: link the brokerage's completed IABS form and the TREC notice here.]",
  },
  { code: "CO", name: "Colorado", notice: "Colorado brokerage disclosures (Definitions of Working Relationships) are available on request. [Placeholder]" },
  { code: "TN", name: "Tennessee", notice: "Tennessee Real Estate Commission licensee disclosures available on request. [Placeholder]" },
  { code: "AZ", name: "Arizona", notice: "Arizona Department of Real Estate licensee disclosures available on request. [Placeholder]" },
  { code: "NC", name: "North Carolina", notice: "Working with Real Estate Agents disclosure (NC Real Estate Commission) available on request. [Placeholder]" },
  { code: "WA", name: "Washington", notice: "Washington law requires delivery of the Real Estate Brokerage in Washington pamphlet. [Placeholder]" },
  { code: "FL", name: "Florida", notice: "Florida brokerage relationship disclosures available on request. [Placeholder]" },
  {
    code: "CA",
    name: "California",
    notice: "California DRE license numbers are displayed for each licensee and brokerage. CA DRE #00000000 (placeholder). [Placeholder]",
  },
  { code: "GA", name: "Georgia", notice: "Georgia Real Estate Commission brokerage engagement disclosures available on request. [Placeholder]" },
  { code: "IL", name: "Illinois", notice: "Illinois Real Estate License Act disclosures available on request. [Placeholder]" },
  { code: "MT", name: "Montana", notice: "Montana Board of Realty Regulation disclosures available on request. [Placeholder]" },
];

export interface NeighborhoodSeed {
  name: string;
  lat: number;
  lng: number;
  r?: number;
  walk: number;
  transit: number;
  bike: number;
  premium: number;
  highlights: string[];
}

export interface CitySeed {
  name: string;
  state: string;
  county: string;
  lat: number;
  lng: number;
  population: number;
  medianHome: number;
  medianRent: number;
  col: number;
  taxRate: number;
  rural?: boolean;
  description: string;
  neighborhoods: NeighborhoodSeed[];
}

export const CITIES: CitySeed[] = [
  {
    name: "Austin",
    state: "TX",
    county: "Travis",
    lat: 30.2672,
    lng: -97.7431,
    population: 979000,
    medianHome: 545000,
    medianRent: 1750,
    col: 103,
    taxRate: 0.018,
    description:
      "Austin has a large tech job market, live music and Hill Country trails. Housing includes historic bungalows near downtown and newer master planned communities with parks and trails.",
    neighborhoods: [
      { name: "Travis Heights", lat: 30.2475, lng: -97.7445, walk: 78, transit: 52, bike: 70, premium: 1.25, highlights: ["Tree lined streets", "South Congress shops", "Blunn Creek trails"] },
      { name: "Hyde Park", lat: 30.3045, lng: -97.729, walk: 82, transit: 55, bike: 80, premium: 1.15, highlights: ["Historic district", "Neighborhood cafés", "Near the university"] },
      { name: "Mueller", lat: 30.2985, lng: -97.7045, walk: 70, transit: 45, bike: 75, premium: 1.1, highlights: ["Lake park", "Farmers market", "Bike trails"] },
      { name: "Zilker", lat: 30.258, lng: -97.769, r: 0.006, walk: 74, transit: 48, bike: 72, premium: 1.35, highlights: ["Zilker Park", "Barton Springs", "Greenbelt access"] },
      { name: "East Austin", lat: 30.262, lng: -97.721, walk: 80, transit: 55, bike: 78, premium: 1.0, highlights: ["Restaurants & galleries", "Close to downtown", "Pocket parks"] },
    ],
  },
  {
    name: "Denver",
    state: "CO",
    county: "Denver",
    lat: 39.7392,
    lng: -104.9903,
    population: 716000,
    medianHome: 590000,
    medianRent: 1950,
    col: 108,
    taxRate: 0.0055,
    description:
      "Denver has a walkable urban core, quick access to the mountains, about 300 sunny days a year and a large park system. Historic Victorians, newer infill homes and condos sit side by side.",
    neighborhoods: [
      { name: "Highland", lat: 39.761, lng: -105.011, walk: 88, transit: 60, bike: 85, premium: 1.2, highlights: ["Skyline views", "Dining on 32nd Ave", "Pedestrian bridges"] },
      { name: "Washington Park", lat: 39.701, lng: -104.97, walk: 80, transit: 50, bike: 82, premium: 1.3, highlights: ["165 acre park", "Lakes & gardens", "Boutique retail"] },
      { name: "Cherry Creek", lat: 39.7175, lng: -104.953, walk: 86, transit: 55, bike: 78, premium: 1.45, highlights: ["Shopping district", "Creek trail", "Galleries"] },
      { name: "RiNo", lat: 39.768, lng: -104.98, walk: 90, transit: 62, bike: 86, premium: 1.05, highlights: ["Arts district", "Breweries", "Light rail"] },
    ],
  },
  {
    name: "Nashville",
    state: "TN",
    county: "Davidson",
    lat: 36.1627,
    lng: -86.7816,
    population: 689000,
    medianHome: 470000,
    medianRent: 1700,
    col: 98,
    taxRate: 0.0065,
    description:
      "Nashville's economy goes beyond music, with large healthcare and finance employers and no state income tax on wages. Many neighborhoods have porches, greenways and a growing restaurant scene.",
    neighborhoods: [
      { name: "East Nashville", lat: 36.179, lng: -86.75, walk: 72, transit: 40, bike: 60, premium: 1.05, highlights: ["Five Points dining", "Shelby Park", "Craft coffee"] },
      { name: "12South", lat: 36.124, lng: -86.79, walk: 80, transit: 38, bike: 62, premium: 1.35, highlights: ["Boutique shopping", "Sevier Park", "Murals"] },
      { name: "Germantown", lat: 36.181, lng: -86.793, walk: 86, transit: 45, bike: 68, premium: 1.25, highlights: ["Farmers market", "Ballpark", "Historic brick homes"] },
      { name: "Sylvan Park", lat: 36.146, lng: -86.844, walk: 68, transit: 35, bike: 58, premium: 1.1, highlights: ["Greenway access", "Local bakeries", "Quiet streets"] },
    ],
  },
  {
    name: "Scottsdale",
    state: "AZ",
    county: "Maricopa",
    lat: 33.4942,
    lng: -111.9261,
    population: 245000,
    medianHome: 860000,
    medianRent: 2300,
    col: 112,
    taxRate: 0.0055,
    description:
      "Scottsdale is known for desert modern architecture, golf, resort amenities, a busy Old Town and miles of preserve trails below the McDowell Mountains.",
    neighborhoods: [
      { name: "Old Town", lat: 33.4935, lng: -111.9255, walk: 82, transit: 35, bike: 64, premium: 1.0, highlights: ["Galleries & dining", "Canal path", "Spring training"] },
      { name: "McCormick Ranch", lat: 33.548, lng: -111.902, walk: 45, transit: 20, bike: 55, premium: 1.0, highlights: ["Lakes & greenbelts", "Paths", "Golf"] },
      { name: "DC Ranch", lat: 33.669, lng: -111.88, walk: 30, transit: 10, bike: 40, premium: 1.6, highlights: ["Mountain views", "Preserve trails", "Market Street"] },
      { name: "Gainey Ranch", lat: 33.574, lng: -111.915, walk: 40, transit: 15, bike: 50, premium: 1.2, highlights: ["Gated enclaves", "Resort amenities", "Golf club"] },
    ],
  },
  {
    name: "Charlotte",
    state: "NC",
    county: "Mecklenburg",
    lat: 35.2271,
    lng: -80.8431,
    population: 897000,
    medianHome: 415000,
    medianRent: 1600,
    col: 97,
    taxRate: 0.0085,
    description:
      "Charlotte is a banking and energy center with leafy older neighborhoods, a light rail line through South End and short drives to lakes and the mountains.",
    neighborhoods: [
      { name: "Dilworth", lat: 35.208, lng: -80.85, walk: 76, transit: 45, bike: 62, premium: 1.3, highlights: ["Freedom Park", "Bungalows", "East Blvd dining"] },
      { name: "South End", lat: 35.2125, lng: -80.859, walk: 88, transit: 60, bike: 72, premium: 1.15, highlights: ["Rail Trail", "Breweries", "Light rail"] },
      { name: "Myers Park", lat: 35.1935, lng: -80.825, walk: 58, transit: 35, bike: 50, premium: 1.6, highlights: ["Mature oaks", "Queens University", "Greenway"] },
      { name: "NoDa", lat: 35.247, lng: -80.807, walk: 78, transit: 48, bike: 66, premium: 1.0, highlights: ["Arts district", "Live music", "Blue Line"] },
    ],
  },
  {
    name: "Raleigh",
    state: "NC",
    county: "Wake",
    lat: 35.7796,
    lng: -78.6382,
    population: 482000,
    medianHome: 445000,
    medianRent: 1550,
    col: 98,
    taxRate: 0.008,
    description:
      "Raleigh is part of the Research Triangle, with universities, life science employers and more than 100 miles of greenway.",
    neighborhoods: [
      { name: "Five Points", lat: 35.8005, lng: -78.6505, walk: 70, transit: 35, bike: 55, premium: 1.25, highlights: ["Historic homes", "Local shops", "Fletcher Park"] },
      { name: "North Hills", lat: 35.8375, lng: -78.642, walk: 72, transit: 30, bike: 50, premium: 1.2, highlights: ["Midtown shopping", "Dining", "Greenway"] },
      { name: "Oakwood", lat: 35.786, lng: -78.6285, walk: 75, transit: 42, bike: 60, premium: 1.1, highlights: ["Victorian district", "Near downtown", "Oakwood Cemetery trails"] },
    ],
  },
  {
    name: "Seattle",
    state: "WA",
    county: "King",
    lat: 47.6062,
    lng: -122.3321,
    population: 755000,
    medianHome: 860000,
    medianRent: 2350,
    col: 135,
    taxRate: 0.009,
    description:
      "Seattle has a large tech and maritime economy, water and mountain views, light rail, and neighborhoods with their own character, including Ballard and West Seattle.",
    neighborhoods: [
      { name: "Capitol Hill", lat: 47.625, lng: -122.321, walk: 96, transit: 85, bike: 80, premium: 1.05, highlights: ["Volunteer Park", "Light rail", "Nightlife"] },
      { name: "Ballard", lat: 47.6685, lng: -122.383, r: 0.006, walk: 90, transit: 65, bike: 85, premium: 1.0, highlights: ["Sunday market", "Locks", "Waterfront dining"] },
      { name: "Queen Anne", lat: 47.6375, lng: -122.357, walk: 88, transit: 70, bike: 70, premium: 1.2, highlights: ["Kerry Park views", "Historic homes", "Seattle Center"] },
      { name: "West Seattle", lat: 47.564, lng: -122.387, r: 0.006, walk: 75, transit: 55, bike: 62, premium: 0.95, highlights: ["Alki Beach", "Junction shops", "Water taxi"] },
    ],
  },
  {
    name: "Miami",
    state: "FL",
    county: "Miami Dade",
    lat: 25.7617,
    lng: -80.1918,
    population: 449000,
    medianHome: 610000,
    medianRent: 2800,
    col: 118,
    taxRate: 0.0095,
    description:
      "Miami is an international city with bayfront high rises, tropical gardens and neighborhoods as different as Brickell's financial district and the shaded streets of Coconut Grove.",
    neighborhoods: [
      { name: "Brickell", lat: 25.759, lng: -80.1985, r: 0.0035, walk: 95, transit: 80, bike: 72, premium: 1.2, highlights: ["Bayfront towers", "Metromover", "Dining"] },
      { name: "Coconut Grove", lat: 25.73, lng: -80.2455, r: 0.005, walk: 78, transit: 48, bike: 66, premium: 1.35, highlights: ["Marinas", "Tree canopy", "CocoWalk"] },
      { name: "Coral Gables", lat: 25.7215, lng: -80.269, walk: 72, transit: 45, bike: 62, premium: 1.4, highlights: ["Miracle Mile", "Venetian Pool", "Mediterranean architecture"] },
      { name: "Edgewater", lat: 25.7995, lng: -80.1925, r: 0.003, walk: 88, transit: 60, bike: 70, premium: 1.05, highlights: ["Bay views", "Margaret Pace Park", "Design District nearby"] },
    ],
  },
  {
    name: "San Diego",
    state: "CA",
    county: "San Diego",
    lat: 32.7157,
    lng: -117.1611,
    population: 1386000,
    medianHome: 960000,
    medianRent: 3000,
    col: 140,
    taxRate: 0.011,
    description:
      "San Diego has mild weather all year, 70 miles of coastline, a strong biotech and defense economy, and neighborhoods such as walkable North Park and oceanfront La Jolla.",
    neighborhoods: [
      { name: "North Park", lat: 32.748, lng: -117.13, walk: 90, transit: 55, bike: 70, premium: 1.0, highlights: ["Craft breweries", "Balboa Park", "Craftsman homes"] },
      { name: "La Jolla", lat: 32.833, lng: -117.26, r: 0.005, walk: 70, transit: 40, bike: 55, premium: 2.0, highlights: ["Ocean views", "Cove & tide pools", "UC San Diego"] },
      { name: "Pacific Beach", lat: 32.799, lng: -117.235, r: 0.005, walk: 85, transit: 45, bike: 82, premium: 1.2, highlights: ["Boardwalk", "Mission Bay", "Surf"] },
      { name: "Little Italy", lat: 32.724, lng: -117.166, r: 0.003, walk: 98, transit: 80, bike: 80, premium: 1.15, highlights: ["Piazzas", "Waterfront", "Trolley"] },
    ],
  },
  {
    name: "Atlanta",
    state: "GA",
    county: "Fulton",
    lat: 33.749,
    lng: -84.388,
    population: 510000,
    medianHome: 415000,
    medianRent: 1750,
    col: 102,
    taxRate: 0.0095,
    description:
      "Atlanta has a large corporate base, the world's busiest airport, the BeltLine trail network, historic intown neighborhoods and a thick tree canopy.",
    neighborhoods: [
      { name: "Midtown", lat: 33.784, lng: -84.383, walk: 92, transit: 70, bike: 75, premium: 1.15, highlights: ["Piedmont Park", "Arts district", "MARTA"] },
      { name: "Virginia Highland", lat: 33.7815, lng: -84.352, walk: 84, transit: 50, bike: 68, premium: 1.3, highlights: ["Bungalows", "Boutiques", "BeltLine access"] },
      { name: "Inman Park", lat: 33.7575, lng: -84.353, walk: 82, transit: 55, bike: 72, premium: 1.25, highlights: ["Victorian homes", "Krog Street Market", "BeltLine"] },
      { name: "Buckhead", lat: 33.8395, lng: -84.38, walk: 70, transit: 45, bike: 55, premium: 1.6, highlights: ["Luxury retail", "Estates", "High rises"] },
    ],
  },
  {
    name: "Chicago",
    state: "IL",
    county: "Cook",
    lat: 41.8781,
    lng: -87.6298,
    population: 2665000,
    medianHome: 345000,
    medianRent: 1950,
    col: 108,
    taxRate: 0.02,
    description:
      "Chicago offers big city amenities at a relatively good value: the lakefront trail, L train access, landmark architecture, and greystones, two flats and lofts in many distinct neighborhoods.",
    neighborhoods: [
      { name: "Lincoln Park", lat: 41.9214, lng: -87.6513, walk: 92, transit: 80, bike: 88, premium: 1.45, highlights: ["Lincoln Park Zoo", "Lakefront", "Brownstones"] },
      { name: "Wicker Park", lat: 41.9088, lng: -87.6796, walk: 94, transit: 82, bike: 92, premium: 1.2, highlights: ["606 Trail", "Boutiques", "Blue Line"] },
      { name: "Logan Square", lat: 41.923, lng: -87.709, walk: 88, transit: 75, bike: 90, premium: 1.0, highlights: ["Boulevards", "Farmers market", "Restaurants"] },
      { name: "West Loop", lat: 41.883, lng: -87.648, walk: 97, transit: 92, bike: 88, premium: 1.3, highlights: ["Restaurant Row", "Lofts", "Fulton Market"] },
    ],
  },
  {
    name: "Fredericksburg",
    state: "TX",
    county: "Gillespie",
    lat: 30.2752,
    lng: -98.872,
    population: 11000,
    medianHome: 525000,
    medianRent: 1600,
    col: 95,
    taxRate: 0.016,
    rural: true,
    description:
      "Fredericksburg is in the center of the Texas Hill Country, with vineyards, peach orchards, limestone creeks and ranchland with long views.",
    neighborhoods: [{ name: "Hill Country", lat: 30.2752, lng: -98.872, r: 0.08, walk: 20, transit: 0, bike: 15, premium: 1.0, highlights: ["Vineyards", "Creeks", "Ranchland"] }],
  },
  {
    name: "Bozeman",
    state: "MT",
    county: "Gallatin",
    lat: 45.677,
    lng: -111.0429,
    population: 56000,
    medianHome: 760000,
    medianRent: 1900,
    col: 110,
    taxRate: 0.008,
    rural: true,
    description:
      "Bozeman is close to Yellowstone and some of the best fly fishing, skiing and hunting in the West, with a university town at its center and open range around it.",
    neighborhoods: [{ name: "Gallatin Valley", lat: 45.7, lng: -111.1, r: 0.1, walk: 10, transit: 0, bike: 10, premium: 1.0, highlights: ["Blue ribbon rivers", "Mountain views", "Open range"] }],
  },
  {
    name: "Asheville",
    state: "NC",
    county: "Buncombe",
    lat: 35.5951,
    lng: -82.5515,
    population: 94000,
    medianHome: 470000,
    medianRent: 1650,
    col: 101,
    taxRate: 0.0065,
    description:
      "Asheville is a Blue Ridge mountain city known for arts, breweries and outdoor recreation, surrounded by hardwood forest, creeks and mountain acreage.",
    neighborhoods: [
      { name: "Montford", lat: 35.605, lng: -82.56, walk: 70, transit: 30, bike: 40, premium: 1.15, highlights: ["Historic district", "Near downtown", "Riverside Cemetery trails"] },
      { name: "Blue Ridge Foothills", lat: 35.62, lng: -82.47, r: 0.06, walk: 10, transit: 0, bike: 10, premium: 1.0, highlights: ["Hardwood forest", "Creeks", "Long range views"] },
    ],
  },
  {
    name: "Franklin",
    state: "TN",
    county: "Williamson",
    lat: 35.9251,
    lng: -86.8689,
    population: 90000,
    medianHome: 900000,
    medianRent: 2400,
    col: 115,
    taxRate: 0.006,
    description:
      "Franklin has a historic main street, rolling Middle Tennessee farmland, horse country and a highly rated school system.",
    neighborhoods: [
      { name: "Downtown Franklin", lat: 35.925, lng: -86.869, walk: 78, transit: 20, bike: 45, premium: 1.2, highlights: ["Main Street", "Harlinsdale Farm", "Historic homes"] },
      { name: "Leiper's Fork", lat: 35.89, lng: -87.0, r: 0.06, walk: 10, transit: 0, bike: 15, premium: 1.0, highlights: ["Horse farms", "Rolling pasture", "Natchez Trace"] },
    ],
  },
];

export function citySlug(city: { name: string; state: string }): string {
  return `${city.name}-${city.state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function stateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Plausible ZIP prefixes per city for sample addresses. */
export const ZIP_BASE: Record<string, string[]> = {
  "austin-tx": ["78704", "78751", "78723", "78746", "78702"],
  "denver-co": ["80211", "80209", "80206", "80205"],
  "nashville-tn": ["37206", "37204", "37208", "37209"],
  "scottsdale-az": ["85251", "85258", "85255", "85260"],
  "charlotte-nc": ["28203", "28203", "28207", "28205"],
  "raleigh-nc": ["27605", "27609", "27604"],
  "seattle-wa": ["98102", "98107", "98109", "98116"],
  "miami-fl": ["33131", "33133", "33134", "33137"],
  "san-diego-ca": ["92104", "92037", "92109", "92101"],
  "atlanta-ga": ["30308", "30306", "30307", "30305"],
  "chicago-il": ["60614", "60622", "60647", "60607"],
  "fredericksburg-tx": ["78624"],
  "bozeman-mt": ["59715"],
  "asheville-nc": ["28801", "28804"],
  "franklin-tn": ["37064", "37064"],
};
