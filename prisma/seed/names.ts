/** Fictional name banks for demo data. Any resemblance to real people or businesses is coincidental. */

export const STREET_ROOTS = [
  "Juniper Hollow", "Cedar Bluff", "Larkspur", "Willow Bend", "Copper Ridge", "Summit Crest", "Amber Field",
  "Heron Point", "Silver Maple", "Briar Glen", "Foxtail", "Lantern Hill", "Meadowlark", "Stonegate",
  "Harbor View", "Aspen Grove", "Bluebell", "Granite Falls", "Indigo", "Kingfisher", "Laurel Canyon",
  "Magnolia Bloom", "Northwind", "Orchard Park", "Pinecone", "Quail Run", "Redbud", "Sandstone",
  "Thistle", "Union Square", "Verbena", "Wren", "Yarrow", "Zephyr", "Birch Hollow", "Clover Leaf",
  "Dovetail", "Elmstead", "Fernwood", "Goldfinch", "Hawthorne", "Ivy Gate", "Jasmine", "Kestrel",
  "Lindenwood", "Marigold", "Nightingale", "Oakmont", "Primrose", "Riverstone", "Saffron", "Tamarack",
  "Upland", "Vista Ridge", "Whitestone", "Alder Creek", "Bellflower", "Chestnut", "Driftwood", "Evening Star",
];

export const STREET_SUFFIXES = ["St", "Ave", "Ln", "Dr", "Ct", "Way", "Blvd", "Pl", "Rd", "Ter", "Trl", "Pkwy"];
export const RURAL_ROADS = ["Ranch Rd", "County Rd", "Creek Rd", "Valley Rd", "Ridge Rd", "Trail", "Hwy"];

export const FIRST_NAMES = [
  "Maya", "Jordan", "Elena", "Marcus", "Priya", "Daniel", "Aisha", "Gabriel", "Sofia", "Andre", "Hannah",
  "Kenji", "Lucia", "Omar", "Grace", "Mateo", "Nadia", "Ethan", "Camila", "Isaac", "Leah", "Rafael", "Zoe",
  "Noah", "Amara", "Julian", "Mei", "Samuel", "Valeria", "Theo", "Imani", "Victor", "Naomi", "Diego",
  "Ruth", "Kwame", "Fatima", "Owen", "Rosa", "Arjun", "Claire", "Malik", "Ingrid", "Tomas",
];

export const LAST_NAMES = [
  "Alvarez", "Brennan", "Chen", "Delgado", "Eriksen", "Fofanah", "Gutierrez", "Hartwell", "Ibarra", "Johansson",
  "Kapoor", "Lindqvist", "Moreau", "Nakamura", "Okafor", "Patel", "Quintero", "Rosen", "Sandoval", "Thornton",
  "Underwood", "Varga", "Whitaker", "Xu", "Yilmaz", "Zamora", "Abernathy", "Bello", "Castellano", "Dube",
  "Ellison", "Ferraro", "Grayson", "Holloway", "Ivers", "Jaramillo", "Kowalski", "Laurent", "Mbeki", "Navarro",
];

export interface BrokerageSeed {
  key: string;
  name: string;
  tagline: string;
  cities: string[];
  color: string;
  kind: "BROKERAGE" | "PROPERTY_MANAGEMENT";
  focus?: "residential" | "commercial" | "land";
  services: string[];
  founded: number;
}

export const BROKERAGES: BrokerageSeed[] = [
  { key: "skyline-stone", name: "Skyline & Stone Realty", tagline: "Austin homes, honestly represented.", cities: ["austin-tx"], color: "#3b3fa8", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Listing & marketing", "Relocation"], founded: 2009 },
  { key: "front-range", name: "Front Range Home Co.", tagline: "Denver, from Highland to Wash Park.", cities: ["denver-co"], color: "#2f6f73", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Listing & marketing", "New construction"], founded: 2012 },
  { key: "cumberland-key", name: "Cumberland Key Realty", tagline: "Middle Tennessee, by people who live here.", cities: ["nashville-tn", "franklin-tn"], color: "#8a5a44", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Listing & marketing", "Farm & estate"], founded: 2006 },
  { key: "saguaro-crest", name: "Saguaro Crest Properties", tagline: "Desert modern, done right.", cities: ["scottsdale-az"], color: "#b5543c", kind: "BROKERAGE", focus: "residential", services: ["Luxury marketing", "Golf communities", "Seasonal rentals"], founded: 2004 },
  { key: "queen-city", name: "Queen City Collective Realty", tagline: "The Carolinas, close up.", cities: ["charlotte-nc", "raleigh-nc", "asheville-nc"], color: "#4a6b8a", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Listing & marketing", "Relocation"], founded: 2011 },
  { key: "evergreen-sound", name: "Evergreen Sound Realty", tagline: "Seattle homes with a view of what matters.", cities: ["seattle-wa"], color: "#3f6e45", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Condo specialists", "Pre-listing prep"], founded: 2008 },
  { key: "bayfront-blue", name: "Bayfront Blue Realty", tagline: "Miami condos, estates and everything between.", cities: ["miami-fl"], color: "#1f7a9c", kind: "BROKERAGE", focus: "residential", services: ["Condo & high-rise", "International buyers", "Waterfront"], founded: 2010 },
  { key: "coast-canyon", name: "Coastline & Canyon Realty", tagline: "San Diego from the beach to the canyons.", cities: ["san-diego-ca"], color: "#c98d4a", kind: "BROKERAGE", focus: "residential", services: ["Coastal homes", "Investment property", "Relocation"], founded: 2003 },
  { key: "peachtree-lantern", name: "Peachtree Lantern Realty", tagline: "Intown Atlanta, lit up.", cities: ["atlanta-ga"], color: "#8e5572", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Listing & marketing", "BeltLine specialists"], founded: 2013 },
  { key: "lakeshore-ledger", name: "Lakeshore Ledger Realty", tagline: "Chicago, block by block.", cities: ["chicago-il"], color: "#41465a", kind: "BROKERAGE", focus: "residential", services: ["Buyer representation", "Two-flat & multi-unit", "Condo specialists"], founded: 2001 },
  { key: "meridian-commercial", name: "Meridian Commercial Advisors", tagline: "Office, retail, industrial and investment sales.", cities: ["austin-tx", "denver-co", "nashville-tn", "charlotte-nc", "seattle-wa", "miami-fl", "san-diego-ca", "atlanta-ga", "chicago-il"], color: "#1f2937", kind: "BROKERAGE", focus: "commercial", services: ["Investment sales", "Tenant representation", "Landlord leasing"], founded: 1998 },
  { key: "open-range", name: "Open Range Land & Ranch Co.", tagline: "Recreational land, ranches and timber.", cities: ["fredericksburg-tx", "bozeman-mt", "asheville-nc", "franklin-tn"], color: "#6b8f71", kind: "BROKERAGE", focus: "land", services: ["Ranch sales", "Recreational land", "Timber & conservation"], founded: 2000 },
  { key: "keystone-residential", name: "Keystone Residential Management", tagline: "Professionally managed apartment communities.", cities: ["austin-tx", "denver-co", "nashville-tn"], color: "#3c4a6b", kind: "PROPERTY_MANAGEMENT", services: ["Leasing", "Maintenance", "Resident services", "Online rent payment"], founded: 2007 },
  { key: "parkline-living", name: "Parkline Living Communities", tagline: "Homes for rent, managed with care.", cities: ["charlotte-nc", "atlanta-ga"], color: "#2f5d62", kind: "PROPERTY_MANAGEMENT", services: ["Leasing", "24/7 maintenance", "Resident app", "Online applications"], founded: 2014 },
];

export const AGENT_TITLES = ["REALTOR®", "Broker Associate", "Associate Broker", "Real Estate Agent", "Team Lead"];
export const SPECIALTIES = [
  "First-time buyers", "Luxury homes", "Relocation", "Condos", "New construction", "Investment property",
  "Downsizing", "Historic homes", "Waterfront", "Rentals & leasing", "Short sales", "Military relocation",
];
export const LANGUAGES = ["English", "Spanish", "Mandarin", "Hindi", "French", "Vietnamese", "Portuguese", "Korean", "Arabic", "Tagalog"];
export const DESIGNATIONS = ["ABR®", "CRS", "GRI", "SRES®", "e-PRO®", "PSA", "SRS", "MRP"];
export const COMMERCIAL_SPECIALTIES = ["Office leasing", "Industrial", "Retail", "Investment sales", "1031 exchanges", "Multifamily"];
export const LAND_SPECIALTIES = ["Ranches", "Recreational land", "Timberland", "Farmland", "Hunting properties", "Conservation easements"];

export const SCHOOL_ROOTS = [
  "Juniper Ridge", "Cedar Point", "Lakeview", "Oak Hollow", "Riverbend", "Summit", "Meadowbrook", "Pinecrest",
  "Willow Creek", "Stonebridge", "Brookside", "Highland Park", "Maple Grove", "Sunrise", "Harborview", "Northgate",
  "Clearwater", "Foxboro", "Greenfield", "Hillcrest", "Ironwood", "Kingsley", "Larkin", "Millbrook",
];

export const AMENITY_NAMES: Record<string, string[]> = {
  GROCERY: ["Harvest Lane Market", "Greenleaf Grocers", "Corner Pantry", "Fieldstone Foods", "Daily Basket"],
  PARK: ["Linden Commons", "Riverside Green", "Sparrow Park", "Founders Field", "Overlook Park"],
  RESTAURANT: ["Ember & Oak", "Little Saffron", "Blue Plate Diner", "Tidewater Kitchen", "Olive Branch Trattoria"],
  COFFEE: ["Steady Grind", "Morning Lantern Coffee", "Copper Kettle Café", "Second Cup"],
  GYM: ["Ironside Fitness", "Northlight Yoga", "Pulse Athletic Club"],
  TRANSIT: ["Central Station", "Market St Stop", "Park & Ride", "Line 2 Station"],
  HOSPITAL: ["Valley Health Clinic", "St. Brigid Medical Center", "Summit Urgent Care"],
  SHOPPING: ["The Mercantile", "Bridgeview Shops", "Old Mill Plaza"],
  LIBRARY: ["Branch Library", "Commons Library"],
};

export const KITCHEN_FEATURES = [
  "quartz-wrapped island with seating", "chef's kitchen with gas range", "bright kitchen with walk-in pantry",
  "renovated kitchen with custom cabinetry", "galley kitchen with stainless appliances", "open kitchen with breakfast bar",
];
export const LIVING_FEATURES = [
  "vaulted living room", "living room with a gas fireplace", "wall of windows facing the yard",
  "open living and dining space", "family room with built-in shelving", "great room with wide-plank floors",
];
export const PRIMARY_FEATURES = [
  "a spa-style bath and double vanity", "a walk-in closet and soaking tub", "a private balcony",
  "a frameless glass shower", "dual closets and a sitting area", "garden views",
];
export const OUTDOOR_FEATURES = [
  "a covered patio and mature shade trees", "a fenced yard with raised garden beds", "a deck built for grilling",
  "a pool and outdoor kitchen", "a low-maintenance xeriscaped yard", "a rooftop deck with skyline views",
];
export const STYLE_WORDS = ["light-filled", "updated", "move-in ready", "thoughtfully renovated", "well-kept", "sun-washed", "modern", "classic"];
export const HOUSE_STYLES = ["craftsman", "contemporary", "modern farmhouse", "mid-century", "traditional", "colonial", "ranch-style", "Spanish-revival"];

export const REVIEW_SNIPPETS = [
  "Responsive, patient and clear about every step. We never felt rushed.",
  "Knew the neighborhood inside and out and gave honest advice about value.",
  "Negotiated a great outcome after inspection and kept the closing on schedule.",
  "Great communicator — answered texts quickly and explained every document.",
  "Helped us price competitively and the home went under contract in a week.",
  "Organized, calm and genuinely helpful through a complicated relocation.",
  "Took time to understand what we wanted and didn't waste our weekends.",
  "Excellent marketing, great photos and constant updates on showings.",
  "Made the rental search painless and spotted a lease issue before we signed.",
  "Deep knowledge of commercial leases; saved us real money on tenant improvements.",
];
