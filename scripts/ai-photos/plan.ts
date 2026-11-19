/**
 * Plans AI-generated listing photos: one tailored prompt per photo slot, keyed by the seed's
 * stable slot key (`<listing key>-<k>`, the same key the placeholder illustration uses).
 *
 *   npm run photos:plan
 *
 * Writes data/ai-photos/plan.json (committed — prompts + alt text, reproducible) and
 * .cache/ai-photos/batches/NNN.json (12 requests each, ready for a Higgsfield batch call).
 * Floor plans and topography maps stay as generated diagrams.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Rng } from "../../src/lib/random";

const db = new PrismaClient();
export const AI_MODEL = "gpt_image_2_6";
export const AI_ASPECT = "3:2";
const BATCH_SIZE = 12;
const PLAN_PATH = path.resolve("data/ai-photos/plan.json");
const BATCH_DIR = path.resolve(".cache/ai-photos/batches");

// ───────────────────────── Regional character ─────────────────────────

interface Style {
  s: string;
  min?: number;
  max?: number;
}
interface Region {
  place: string;
  homes: Style[];
  landscape: string;
  interiors: string[];
  aerial: string;
  view: string;
  townhome: string;
  land: string;
  light?: string;
}

const REGIONS: Record<string, Region> = {
  "Austin|TX": {
    place: "Austin, Texas",
    homes: [
      { s: "modern farmhouse with white board-and-batten siding, black windows and a standing-seam metal roof", min: 2005 },
      { s: "Hill Country limestone ranch house with a deep porch and metal roof" },
      { s: "mid-century modern ranch with clerestory windows and a carport", min: 1950, max: 1975 },
      { s: "contemporary two-story home with white stucco, cedar accents and black steel windows", min: 2008 },
      { s: "craftsman bungalow with a wide front porch and tapered columns", max: 1950 },
      { s: "two-story home with Austin limestone, fiber-cement siding and a two-car garage", min: 1985 },
    ],
    landscape: "live oak trees and native drought-tolerant landscaping",
    interiors: ["modern farmhouse", "Hill Country contemporary", "mid-century modern", "warm minimalist"],
    aerial: "a tree-canopied Austin neighborhood with the downtown skyline in the distance",
    view: "the downtown Austin skyline and Lady Bird Lake",
    townhome: "fiber-cement and limestone",
    land: "rolling Texas Hill Country with live oaks and limestone outcrops",
  },
  "Denver|CO": {
    place: "Denver, Colorado",
    homes: [
      { s: "classic red-brick Denver Square with a covered front porch", max: 1930 },
      { s: "brick bungalow with a gabled porch", max: 1955 },
      { s: "modern three-story home with dark metal panels and warm wood siding", min: 2010 },
      { s: "Victorian with ornate trim painted in muted colors", max: 1910 },
      { s: "mountain-modern home with a stone base, timber accents and big windows", min: 1995 },
      { s: "updated brick ranch with a low-pitched roof and a front lawn", min: 1950, max: 1985 },
    ],
    landscape: "mature trees, a green lawn and perennial beds",
    interiors: ["Scandinavian modern", "mountain modern", "updated craftsman", "urban contemporary"],
    aerial: "a Denver neighborhood grid with mature trees and the Rocky Mountains on the horizon",
    view: "the Denver skyline with the Rocky Mountains beyond",
    townhome: "brick and dark metal",
    land: "Colorado foothills grassland with ponderosa pines",
  },
  "Nashville|TN": {
    place: "Nashville, Tennessee",
    homes: [
      { s: "brick craftsman bungalow with a deep front porch", max: 1950 },
      { s: "tall-and-skinny modern home with board-and-batten siding", min: 2010 },
      { s: "white-painted brick farmhouse with black shutters" },
      { s: "Victorian cottage with a wraparound porch", max: 1915 },
      { s: "two-story traditional brick home with a gabled roof", min: 1960 },
    ],
    landscape: "magnolia and dogwood trees and a green lawn",
    interiors: ["Southern transitional", "modern farmhouse", "eclectic vintage-modern", "warm traditional"],
    aerial: "a leafy Nashville neighborhood with the downtown skyline in the distance",
    view: "the Nashville skyline at golden hour",
    townhome: "red brick",
    land: "rolling Middle Tennessee hills with hardwood tree lines",
  },
  "Scottsdale|AZ": {
    place: "Scottsdale, Arizona",
    homes: [
      { s: "desert contemporary home with smooth stucco, a flat roof and floor-to-ceiling glass", min: 1995 },
      { s: "Spanish colonial revival home with a red clay tile roof and an arched entry" },
      { s: "Santa Fe-style adobe home with rounded parapets and wood vigas" },
      { s: "single-story ranch with stucco walls and a tile roof", max: 1995 },
      { s: "modern desert villa with stone accents and a courtyard entry", min: 2000 },
    ],
    landscape: "saguaro cacti, palo verde trees and desert landscaping",
    interiors: ["desert contemporary", "Spanish revival", "warm minimalist", "Southwest modern"],
    aerial: "a Scottsdale neighborhood with backyard pools, desert landscaping and the McDowell Mountains",
    view: "the McDowell Mountains glowing at sunset over the desert",
    townhome: "smooth stucco",
    land: "Sonoran desert with saguaros and distant mountains",
  },
  "Charlotte|NC": {
    place: "Charlotte, North Carolina",
    homes: [
      { s: "two-story brick colonial with black shutters" },
      { s: "white farmhouse with a wraparound porch", min: 1990 },
      { s: "craftsman home with stone porch columns", min: 1995 },
      { s: "modern traditional home with gray siding and a two-car garage", min: 2000 },
      { s: "Tudor-style brick home with a steep gable", max: 1950 },
    ],
    landscape: "tall pines, azaleas and a manicured lawn",
    interiors: ["Southern transitional", "classic traditional", "coastal casual", "modern farmhouse"],
    aerial: "a wooded Charlotte suburb with curving streets and the uptown skyline in the distance",
    view: "the uptown Charlotte skyline",
    townhome: "brick and painted siding",
    land: "Carolina Piedmont pasture with pine tree lines",
  },
  "Raleigh|NC": {
    place: "Raleigh, North Carolina",
    homes: [
      { s: "craftsman home with cedar-shake accents", min: 1990 },
      { s: "red-brick colonial with white trim" },
      { s: "modern farmhouse with board-and-batten siding", min: 2005 },
      { s: "brick ranch with a covered front porch", max: 1990 },
      { s: "new traditional home with a rocking-chair front porch", min: 2010 },
    ],
    landscape: "loblolly pines, dogwoods and a green lawn",
    interiors: ["transitional", "modern farmhouse", "classic Southern", "Scandinavian modern"],
    aerial: "a Raleigh neighborhood surrounded by pine forest",
    view: "a sea of treetops and downtown Raleigh",
    townhome: "brick and lap siding",
    land: "North Carolina woodland and meadow",
  },
  "Seattle|WA": {
    place: "Seattle, Washington",
    homes: [
      { s: "Pacific Northwest modern home with cedar siding and large windows", min: 1995 },
      { s: "craftsman bungalow with a covered porch", max: 1940 },
      { s: "modern home with dark siding, a flat roof and a rooftop deck", min: 2010 },
      { s: "1920s Tudor with a steep roof and leaded windows", max: 1935 },
      { s: "updated mid-century home with wide eaves and cedar accents", min: 1950, max: 1975 },
    ],
    landscape: "Douglas firs, ferns and a moss-green lawn",
    interiors: ["Pacific Northwest modern", "Scandinavian", "craftsman", "Japandi"],
    aerial: "a Seattle neighborhood with evergreen trees and Puget Sound in the distance",
    view: "Puget Sound and the Olympic Mountains",
    townhome: "dark fiber-cement and cedar",
    land: "Pacific Northwest evergreen forest with a clearing",
    light: "soft overcast daylight",
  },
  "Miami|FL": {
    place: "Miami, Florida",
    homes: [
      { s: "tropical modern home with white stucco, a flat roof and floor-to-ceiling glass", min: 2000 },
      { s: "Mediterranean revival villa with a barrel-tile roof", max: 1990 },
      { s: "mid-century Miami Modern home with breeze-block accents", min: 1950, max: 1975 },
      { s: "Key West-style home with a metal roof and shutters" },
      { s: "contemporary waterfront home with a private dock", min: 2005 },
    ],
    landscape: "royal palms and lush tropical landscaping",
    interiors: ["tropical modern", "coastal contemporary", "Mediterranean", "bright minimalist"],
    aerial: "a Miami neighborhood with canals, palm trees and Biscayne Bay",
    view: "Biscayne Bay and the Miami skyline",
    townhome: "white stucco",
    land: "South Florida pine flatwoods and wetlands",
  },
  "San Diego|CA": {
    place: "San Diego, California",
    homes: [
      { s: "Spanish revival home with a red tile roof and arched windows", max: 1990 },
      { s: "coastal craftsman with shingle siding", max: 1950 },
      { s: "mid-century modern home with a low-slung roofline", min: 1950, max: 1975 },
      { s: "modern coastal home with white siding and glass railings", min: 2005 },
      { s: "California ranch with a stone accent wall", min: 1955, max: 1995 },
    ],
    landscape: "palms, succulents and bougainvillea",
    interiors: ["coastal California", "Spanish revival", "mid-century modern", "airy modern"],
    aerial: "a coastal San Diego neighborhood with the Pacific Ocean in the distance",
    view: "the Pacific Ocean at sunset",
    townhome: "white stucco and wood",
    land: "Southern California chaparral hills",
  },
  "Atlanta|GA": {
    place: "Atlanta, Georgia",
    homes: [
      { s: "craftsman bungalow with a deep front porch", max: 1940 },
      { s: "Georgian brick colonial with white columns" },
      { s: "modern farmhouse with painted white brick", min: 2005 },
      { s: "Tudor revival with stone accents", max: 1945 },
      { s: "contemporary home with black windows and cedar accents", min: 2010 },
    ],
    landscape: "towering hardwoods, azaleas and a green lawn",
    interiors: ["Southern transitional", "modern traditional", "eclectic", "classic"],
    aerial: "a leafy Atlanta neighborhood with the Midtown skyline in the distance",
    view: "the Midtown Atlanta skyline",
    townhome: "brick and painted siding",
    land: "Georgia Piedmont hardwood forest and pasture",
  },
  "Chicago|IL": {
    place: "Chicago, Illinois",
    homes: [
      { s: "classic brick two-flat with a bay window", max: 1930 },
      { s: "limestone greystone townhouse", max: 1920 },
      { s: "vintage brick bungalow", max: 1940 },
      { s: "modern single-family home with brick and black metal", min: 2008 },
      { s: "Victorian frame house with a front porch", max: 1905 },
    ],
    landscape: "parkway trees and a small front garden",
    interiors: ["urban loft", "classic vintage with crown molding", "contemporary", "Scandinavian"],
    aerial: "a Chicago neighborhood grid with alleys and the skyline on the horizon",
    view: "the Chicago skyline and Lake Michigan",
    townhome: "brick",
    land: "Illinois prairie and farmland",
  },
  "Fredericksburg|TX": {
    place: "Fredericksburg, Texas",
    homes: [
      { s: "German-style limestone farmhouse with a metal roof" },
      { s: "Hill Country ranch house with a wraparound porch" },
      { s: "modern farmhouse with limestone and metal siding", min: 2005 },
      { s: "board-and-batten cottage with a tin roof" },
    ],
    landscape: "live oaks, wildflowers and rolling Hill Country",
    interiors: ["Hill Country farmhouse", "rustic modern", "Texas ranch", "European farmhouse"],
    aerial: "rolling Texas Hill Country ranch land with live oaks",
    view: "rolling Hill Country hills and vineyards",
    townhome: "limestone",
    land: "rolling Texas Hill Country with live oaks, limestone and wildflowers",
  },
  "Bozeman|MT": {
    place: "Bozeman, Montana",
    homes: [
      { s: "mountain-modern home with timber, stone and a metal roof", min: 2000 },
      { s: "log home with a wraparound deck" },
      { s: "modern farmhouse with board-and-batten siding and a metal roof", min: 2005 },
      { s: "craftsman-style mountain home" },
      { s: "contemporary ranch with large windows facing the mountains", min: 1995 },
    ],
    landscape: "native grasses, aspens and the Bridger Mountains",
    interiors: ["rustic mountain modern", "log cabin chic", "Scandinavian mountain", "modern lodge"],
    aerial: "Gallatin Valley ranch land with the Bridger Mountains",
    view: "the snow-capped Bridger Mountains",
    townhome: "wood and metal",
    land: "Montana ranch land with big sky and snow-capped mountains",
  },
  "Asheville|NC": {
    place: "Asheville, North Carolina",
    homes: [
      { s: "Arts and Crafts bungalow with stone porch columns", max: 1945 },
      { s: "mountain craftsman home with cedar shakes", min: 1990 },
      { s: "modern cabin with large windows in the forest", min: 2005 },
      { s: "farmhouse on a hillside with a long porch" },
      { s: "Tudor revival cottage", max: 1940 },
    ],
    landscape: "rhododendrons, hardwood forest and Blue Ridge views",
    interiors: ["Appalachian craftsman", "rustic modern", "eclectic artsy", "cozy cabin"],
    aerial: "forested Blue Ridge hills with winding roads",
    view: "layered Blue Ridge Mountains at sunrise",
    townhome: "board-and-batten",
    land: "Blue Ridge mountain hardwood forest with long views",
  },
  "Franklin|TN": {
    place: "Franklin, Tennessee",
    homes: [
      { s: "white Southern farmhouse with a metal roof and a wraparound porch" },
      { s: "brick traditional estate with white columns" },
      { s: "modern farmhouse with board-and-batten siding", min: 2005 },
      { s: "historic Victorian with a gingerbread porch", max: 1910 },
      { s: "new traditional home with stone accents", min: 2008 },
    ],
    landscape: "rolling pasture, white board fences and old oaks",
    interiors: ["Southern farmhouse", "classic traditional", "modern farmhouse", "transitional"],
    aerial: "rolling Middle Tennessee farmland with white board fences",
    view: "rolling green pastures",
    townhome: "brick",
    land: "rolling Middle Tennessee horse country with white fences",
  },
};

const FALLBACK: Region = {
  place: "an American suburb",
  homes: [{ s: "two-story traditional home with a front porch" }, { s: "single-story ranch home" }],
  landscape: "mature trees and a green lawn",
  interiors: ["transitional", "modern"],
  aerial: "a tree-lined suburban neighborhood",
  view: "a wide open landscape",
  townhome: "brick",
  land: "open countryside",
};

// ───────────────────────── Scene variants ─────────────────────────

const V = {
  KITCHEN: [
    "white shaker cabinets, a quartz waterfall island and brass pendants",
    "navy lower cabinets, white uppers and a marble-look island",
    "sage-green cabinets, a butcher-block island and open shelving",
    "flat-panel walnut cabinets and a long quartz island",
    "two-tone gray and white cabinets with a granite peninsula",
    "matte black cabinets, a white zellige backsplash and an oak island",
    "cream inset cabinets, a farmhouse sink and a marble backsplash",
    "white gloss cabinets in a galley layout with stainless appliances",
    "warm wood cabinets in a U-shape with a breakfast bar",
    "light oak cabinets, terrazzo counters and a skylight",
  ],
  KITCHEN_LUX: ["a chef's kitchen with a professional range, double islands and custom cabinetry", "a marble-clad kitchen with a statement range hood and paneled appliances"],
  LIVING_ROOM: [
    "open-concept living room with a sectional sofa and a view into the kitchen",
    "living room with a stone fireplace and built-in bookshelves",
    "vaulted living room with exposed wood beams and tall windows",
    "cozy living room with a brick fireplace and leather armchairs",
    "bright living room with floor-to-ceiling windows and a modular sofa",
    "living room with a shiplap fireplace wall and a jute rug",
    "living room with a bay window, a linen sofa and indoor plants",
    "sunken living room with a curved sofa and a statement light",
  ],
  LIVING_ROOM_LUX: ["two-story great room with a wall of windows and a grand fireplace", "formal living room with a coffered ceiling and a marble fireplace"],
  LIVING_ROOM_APT: ["apartment living room with a balcony door and a compact sofa", "open living area with wide windows, a sofa and a dining table"],
  DINING_ROOM: [
    "dining room with a round oak table and a sculptural chandelier",
    "dining area with a long farmhouse table and bench seating",
    "formal dining room with wainscoting and a crystal chandelier",
    "dining nook with a built-in banquette by a bay window",
    "open dining area with a walnut table and a modern pendant",
    "dining room with a black table, rattan chairs and large windows",
  ],
  PRIMARY_BEDROOM: [
    "primary bedroom with an upholstered king bed and soft linen bedding",
    "primary suite with a tray ceiling and a sitting area",
    "primary bedroom with a wood-paneled accent wall and large windows",
    "serene primary bedroom with a canopy bed and a neutral palette",
    "primary bedroom with French doors to a private patio",
    "primary bedroom with a low platform bed and a reading chair",
  ],
  BEDROOM: [
    "guest bedroom with a queen bed and a reading chair",
    "secondary bedroom set up as a home office with a desk by the window",
    "kids' bedroom with twin beds and calm neutral decor",
    "cozy bedroom with a daybed and built-in shelves",
    "bright bedroom with a full bed and a patterned rug",
    "small bedroom with a nightstand, plants and a large window",
  ],
  BATHROOM_PRIMARY: [
    "primary bathroom with a freestanding tub and a walk-in glass shower",
    "spa-like bathroom with a double vanity and large-format stone tile",
    "primary bathroom with a curbless shower and a floating walnut vanity",
    "bathroom with a clawfoot tub, hexagon floor tile and a pedestal sink",
  ],
  BATHROOM: [
    "hall bathroom with a tub-shower combo and white subway tile",
    "guest bathroom with a single vanity, a round mirror and green tile",
    "powder room with patterned wallpaper and a vessel sink",
    "updated bathroom with a walk-in shower and matte black fixtures",
    "bathroom with a terrazzo floor, a wood vanity and a skylight",
  ],
  BACKYARD: [
    "backyard with a wood deck, a lawn and string lights",
    "stone patio with an outdoor dining table and garden beds",
    "covered patio with an outdoor kitchen and lounge seating",
    "fenced backyard with a lawn and mature trees",
    "screened porch overlooking a wooded backyard",
  ],
  AMENITY: [
    "resort-style apartment swimming pool with cabanas",
    "resident fitness center with cardio machines and free weights",
    "resident clubhouse lounge with a coffee bar",
    "rooftop terrace with lounge seating",
    "coworking lounge with private work pods",
    "landscaped courtyard with grills and seating",
  ],
  LOBBY: ["modern residential lobby with a concierge desk and seating", "office lobby with stone floors and a reception desk", "bright lobby with a living green wall and lounge chairs"],
  OFFICE: ["open-plan office with workstations and an exposed ceiling", "glass-walled conference room with a long table", "private office with a desk and city views", "creative office with brick walls and timber beams"],
  WAREHOUSE: ["high-bay warehouse interior with a polished concrete floor and tall clear height", "warehouse loading docks with roll-up doors", "light-industrial flex space with an office mezzanine"],
  RETAIL_SPACE: ["vacant retail space with a glass storefront and polished concrete floors", "restaurant-ready retail space with an open ceiling", "boutique retail space with track lighting and white walls"],
  LAND: ["open acreage of rolling grassland", "wooded acreage with a meadow clearing", "gently sloping homesite with long views", "wildflower meadow on open land"],
  WATER: ["spring-fed creek with clear water over rocks", "stock pond with grassy banks", "river frontage with a gravel bar", "small lake with a wooden dock"],
  FOREST: ["hardwood forest with a walking trail", "pine forest with dappled light", "oak woodland with a clearing", "mixed timber stand on a hillside"],
  PASTURE: ["fenced pasture with green grass", "hay meadow with round bales", "grazing land with a stock tank", "rolling pasture with a cattle pen"],
  STRUCTURE: ["red barn with a metal roof", "rustic cabin on the property", "equipment shed and corrals", "old stone farmhouse on the land"],
  EXTERIOR_EXTRA: ["rear exterior with a patio and a lawn", "twilight exterior with warm interior lights", "side view of the home and driveway"],
};

const EXTERIOR_BUILDING = {
  condo: ["modern mid-rise condominium building with glass balconies", "high-rise residential tower with floor-to-ceiling windows", "boutique four-story condo building with brick and metal"],
  apartment: ["garden-style apartment community with landscaped grounds", "modern four-story apartment building around a courtyard", "contemporary mid-rise apartment building with a leasing office"],
  multi: ["three-story brick apartment building", "modern fourplex with private entries"],
};

const COMMERCIAL_EXTERIOR: Record<string, string> = {
  OFFICE: "four-story Class A office building with a glass curtain wall and a landscaped entry",
  RETAIL: "neighborhood retail strip center with storefronts and a parking lot",
  INDUSTRIAL: "modern tilt-up industrial warehouse with loading docks and a truck court",
  MIXED_USE: "mixed-use building with ground-floor retail and apartments above",
  MULTI_FAMILY: "three-story brick apartment building",
};

/** Later exterior shots of a commercial listing: another angle of the same property, never a repeat of the hero. */
const COMMERCIAL_EXTERIOR_EXTRA: Record<string, string[]> = {
  OFFICE: ["landscaped entry plaza and glass lobby entrance of a four-story Class A office building", "side elevation and surface parking of a four-story Class A office building with a glass curtain wall"],
  RETAIL: ["covered storefront walkway with glass tenant entrances at a neighborhood retail strip center", "landscaped parking lot frontage of a neighborhood retail strip center"],
  INDUSTRIAL: ["truck court with dock-high doors and trailer parking at a modern tilt-up industrial warehouse", "glass office entrance at the corner of a modern tilt-up industrial warehouse with landscaping"],
  MIXED_USE: ["street-level storefronts with awnings at a mixed-use building with apartments above", "corner view of a mixed-use building with ground-floor retail and balconies above"],
  MULTI_FAMILY: ["rear courtyard and parking of a three-story brick apartment building", "entry walkway and landscaping of a three-story brick apartment building"],
};

const LIGHT = ["late-afternoon sun", "soft morning light", "clear midday sky", "golden-hour light"];
const PHOTO = "Professional real estate listing photo, photorealistic";
const NO = "No people, no text, no watermark.";

// ───────────────────────── Planner ─────────────────────────

type ListingRow = Awaited<ReturnType<typeof loadListings>>[number];

async function loadListings() {
  return db.listing.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      category: true,
      transactionType: true,
      propertyType: true,
      city: true,
      state: true,
      price: true,
      isLuxury: true,
      yearBuilt: true,
      hasPool: true,
      isWaterfront: true,
      hasView: true,
      hasFireplace: true,
      isCommunity: true,
      isNewConstruction: true,
      media: { where: { provider: { in: ["GENERATED", "AI"] }, category: { notIn: ["FLOOR_PLAN", "TOPOGRAPHY"] } }, orderBy: { sortOrder: "asc" }, select: { id: true, category: true, providerId: true } },
    },
  });
}

function tierOf(l: ListingRow): "luxury" | "upscale" | "mid" | "starter" {
  const rent = l.transactionType !== "SALE";
  if (l.isLuxury || (!rent && l.price >= 1_500_000) || (rent && l.price >= 6000)) return "luxury";
  if ((!rent && l.price >= 700_000) || (rent && l.price >= 3200)) return "upscale";
  if ((!rent && l.price < 350_000) || (rent && l.price < 1600)) return "starter";
  return "mid";
}

const FINISHES = {
  luxury: "luxury finishes, natural stone, custom millwork and designer lighting",
  upscale: "high-end finishes, quartz, hardwood floors and designer lighting",
  mid: "updated finishes, quartz counters and wood floors",
  starter: "clean, modestly updated finishes",
} as const;

function eraFilter(styles: Style[], year: number | null): Style[] {
  if (!year) return styles;
  const fit = styles.filter((s) => (s.min == null || year >= s.min) && (s.max == null || year <= s.max));
  return fit.length ? fit : styles;
}

interface Slot {
  slot: number;
  key: string;
  listingSlug: string;
  mediaId: string;
  category: string;
  scene: string;
  prompt: string;
  alt: string;
}

function planListing(l: ListingRow, start: number): Slot[] {
  const region = REGIONS[`${l.city}|${l.state}`] ?? FALLBACK;
  const rng = new Rng(`ai-photos:${l.slug}`);
  const tier = tierOf(l);
  const apartment = l.isCommunity || l.propertyType === "APARTMENT";
  const condo = l.propertyType === "CONDO";
  const homeStyle = rng.pick(eraFilter(region.homes, l.yearBuilt)).s;
  const interior = rng.pick(region.interiors);
  const finishes = apartment ? "modern apartment finishes, vinyl plank floors and white cabinets" : FINISHES[tier];
  const homeNoun = apartment ? "apartment" : condo ? "condo" : l.propertyType === "TOWNHOUSE" ? "townhome" : "home";
  const light = region.light ?? rng.pick(LIGHT);
  const used = new Map<string, Set<number>>();
  const counts = new Map<string, number>();

  /** Pick a variant not yet used in this listing (keeps rooms of one type distinct within a home). */
  const variant = (pool: string, list: string[]) => {
    const seen = used.get(pool) ?? new Set<number>();
    const options = list.map((_, i) => i).filter((i) => !seen.has(i));
    const i = rng.pick(options.length ? options : list.map((_, j) => j));
    seen.add(i);
    used.set(pool, seen);
    return list[i]!;
  };
  const interiorPrompt = (scene: string) => `${PHOTO}: ${scene} in a ${interior}-style ${homeNoun} in ${region.place}, ${finishes}. Wide-angle, natural daylight, staged and uncluttered, straight verticals. ${NO}`;

  return l.media.map((m, i) => {
    const match = /^(?:gen|ai):([a-z-]+):(.+)$/.exec(m.providerId ?? "");
    if (!match) throw new Error(`Unexpected placeholder id ${m.providerId}`);
    const [, scene, key] = match as unknown as [string, string, string];
    const nth = counts.get(scene) ?? 0;
    counts.set(scene, nth + 1);
    let prompt: string;
    let alt: string;

    switch (scene) {
      case "exterior-house": {
        if (nth === 0) {
          const style = l.propertyType === "MULTI_FAMILY" ? "side-by-side duplex with two front entries" : homeStyle;
          const isNew = l.isNewConstruction ? "brand-new " : "";
          prompt = `${PHOTO}: front exterior of a ${isNew}${style} in ${region.place}, ${region.landscape}. ${light}, eye-level wide-angle, crisp HDR. No people, no cars, no text, no watermark.`;
          alt = `Front of the home: ${isNew}${style}`;
        } else {
          const extra = variant("ext", tier === "luxury" ? V.EXTERIOR_EXTRA : V.EXTERIOR_EXTRA.filter((x) => !x.startsWith("twilight")));
          prompt = `${PHOTO}: ${extra} of a ${homeStyle} in ${region.place}, ${region.landscape}. Wide-angle, crisp HDR. ${NO}`;
          alt = `Exterior: ${extra}`;
        }
        break;
      }
      case "exterior-townhome": {
        prompt = `${PHOTO}: front exterior of a row of modern three-story ${region.townhome} townhomes with private garages in ${region.place}, ${region.landscape}. ${light}, eye-level wide-angle, crisp HDR. No people, no cars, no text, no watermark.`;
        alt = `Front exterior: modern ${region.townhome} townhomes`;
        break;
      }
      case "exterior-building": {
        const kind = apartment ? "apartment" : condo ? "condo" : "multi";
        const style = variant(`bld-${kind}`, EXTERIOR_BUILDING[kind]);
        prompt = `${PHOTO}: exterior of a ${style} in ${region.place}, ${region.landscape}. ${light}, eye-level wide-angle, straight verticals. No people, no readable signage, no text, no watermark.`;
        alt = `Building exterior: ${style}`;
        break;
      }
      case "exterior-commercial": {
        const style = COMMERCIAL_EXTERIOR[l.propertyType] ?? "modern commercial building";
        // Later shots take another angle, chosen by position so the random stream (and every other slot) is unchanged.
        const extras = COMMERCIAL_EXTERIOR_EXTRA[l.propertyType] ?? [`side view and parking of a ${style}`];
        const shot = nth === 0 ? `exterior of a ${style}` : extras[(nth - 1) % extras.length]!;
        prompt = `${PHOTO}: ${shot} in ${region.place}. ${light}, eye-level wide-angle, straight verticals. No people, no readable signage or logos, no text, no watermark.`;
        alt = nth === 0 ? `Property exterior: ${style}` : `Property exterior: ${shot}`;
        break;
      }
      case "aerial-residential":
        prompt = `${PHOTO}: drone aerial view of a ${homeStyle} and ${region.aerial}. ${light}, high detail. ${NO}`;
        alt = `Aerial view of the home and neighborhood`;
        break;
      case "aerial-commercial":
        prompt = `${PHOTO}: drone aerial view of a ${COMMERCIAL_EXTERIOR[l.propertyType] ?? "commercial building"} with parking and surrounding streets in ${region.place}. ${light}, high detail. ${NO}`;
        alt = `Aerial view of the property and surroundings`;
        break;
      case "aerial-land":
        prompt = `${PHOTO}: drone aerial view of a large land parcel: ${region.land}. ${light}, high detail. ${NO}`;
        alt = `Aerial view of the acreage`;
        break;
      case "living-room": {
        const list = apartment ? V.LIVING_ROOM_APT.concat(V.LIVING_ROOM.slice(0, 2)) : tier === "luxury" ? V.LIVING_ROOM_LUX.concat(V.LIVING_ROOM) : V.LIVING_ROOM;
        const scene2 = variant("living", list);
        prompt = interiorPrompt(l.hasView && !apartment ? `${scene2}, windows framing ${region.view}` : scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "kitchen": {
        const desc = tier === "luxury" && nth === 0 && !apartment ? variant("kitchen", V.KITCHEN_LUX) : variant("kitchen", V.KITCHEN);
        const scene2 = desc.startsWith("a ") ? desc.slice(2) : `kitchen with ${desc}`;
        prompt = interiorPrompt(scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "dining-room": {
        const scene2 = variant("dining", V.DINING_ROOM);
        prompt = interiorPrompt(scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "primary-bedroom": {
        const scene2 = variant("primary", V.PRIMARY_BEDROOM);
        prompt = interiorPrompt(l.hasView ? `${scene2}, with a view of ${region.view}` : scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "bedroom": {
        const scene2 = variant("bedroom", V.BEDROOM);
        prompt = interiorPrompt(scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "bathroom": {
        const scene2 = nth === 0 && !apartment && tier !== "starter" ? variant("bath-primary", V.BATHROOM_PRIMARY) : variant("bath", V.BATHROOM);
        prompt = interiorPrompt(scene2);
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "backyard": {
        const desert = l.state === "AZ";
        const scene2 = l.hasPool
          ? "backyard with a swimming pool, a stone patio and lounge chairs"
          : l.isWaterfront
            ? "backyard lawn leading to a private dock on the water"
            : desert
              ? "desert backyard with a covered patio, a fire pit and xeriscape"
              : variant("yard", V.BACKYARD);
        prompt = `${PHOTO}: ${scene2} of a ${homeStyle} in ${region.place}, ${region.landscape}. ${light}, wide-angle, crisp HDR. ${NO}`;
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "amenity": {
        const scene2 = variant("amenity", V.AMENITY);
        prompt = `${PHOTO}: ${scene2} at a ${apartment ? "modern apartment community" : "condominium building"} in ${region.place}. Wide-angle, natural light, clean and inviting. ${NO}`;
        alt = `Amenity: ${scene2}`;
        break;
      }
      case "view": {
        const from = rng.pick(["from a private balcony", "through floor-to-ceiling windows", "from a rooftop terrace"]);
        prompt = `${PHOTO}: view of ${region.view} ${from} of a ${homeNoun} in ${region.place}. ${light}, high detail. ${NO}`;
        alt = `View of ${region.view} ${from}`;
        break;
      }
      case "lobby": {
        const scene2 = variant("lobby", V.LOBBY);
        prompt = `${PHOTO}: ${scene2} in ${region.place}, ${l.category === "COMMERCIAL" ? "commercial building" : "residential building"}. Wide-angle, straight verticals, natural light. ${NO}`;
        alt = `Lobby: ${scene2}`;
        break;
      }
      case "office": {
        const scene2 = variant("office", V.OFFICE);
        prompt = `${PHOTO}: ${scene2} in a modern office building in ${region.place}. Wide-angle, natural light, unoccupied and tidy. ${NO}`;
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "warehouse": {
        const scene2 = variant("warehouse", V.WAREHOUSE);
        prompt = `${PHOTO}: ${scene2} in ${region.place}. Wide-angle, even lighting, empty and clean. ${NO}`;
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "retail-space": {
        const scene2 = variant("retail", V.RETAIL_SPACE);
        prompt = `${PHOTO}: ${scene2} in ${region.place}. Wide-angle, bright and empty. No people, no logos or readable signage, no text, no watermark.`;
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      case "land":
      case "water":
      case "forest":
      case "pasture":
      case "structure": {
        const list = V[scene.toUpperCase() as "LAND" | "WATER" | "FOREST" | "PASTURE" | "STRUCTURE"];
        const scene2 = variant(scene, list);
        prompt = `${PHOTO}: ${scene2} in ${region.land}, near ${region.place}. ${light}, wide landscape view, high detail. No people, no text, no watermark.`;
        alt = scene2.charAt(0).toUpperCase() + scene2.slice(1);
        break;
      }
      default:
        throw new Error(`No prompt template for scene ${scene}`);
    }
    return { slot: start + i, key, listingSlug: l.slug, mediaId: m.id, category: m.category, scene, prompt: prompt.replace(/\s+/g, " ").trim(), alt };
  });
}

async function main() {
  const listings = await loadListings();
  const slots: Slot[] = [];
  for (const l of listings) slots.push(...planListing(l, slots.length));
  const keys = new Set(slots.map((s) => s.key));
  if (keys.size !== slots.length) throw new Error("Duplicate slot keys");
  fs.mkdirSync(path.dirname(PLAN_PATH), { recursive: true });
  fs.writeFileSync(PLAN_PATH, JSON.stringify({ version: 1, model: AI_MODEL, aspectRatio: AI_ASPECT, createdAt: new Date().toISOString(), slots }, null, 1));
  fs.rmSync(BATCH_DIR, { recursive: true, force: true });
  fs.mkdirSync(BATCH_DIR, { recursive: true });
  let batches = 0;
  for (let i = 0; i < slots.length; i += BATCH_SIZE) {
    const requests = slots.slice(i, i + BATCH_SIZE).map((s) => ({ index: s.slot, params: { model: AI_MODEL, aspect_ratio: AI_ASPECT, prompt: s.prompt } }));
    fs.writeFileSync(path.join(BATCH_DIR, `${String(batches).padStart(3, "0")}.json`), JSON.stringify(requests));
    batches++;
  }
  const avg = Math.round(slots.reduce((a, s) => a + s.prompt.length, 0) / slots.length);
  console.log(`Planned ${slots.length} photos for ${listings.length} listings in ${batches} batches (avg prompt ${avg} chars).`);
  console.log(`Estimated cost at 0.25 credits each: ${(slots.length * 0.25).toFixed(2)} credits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
