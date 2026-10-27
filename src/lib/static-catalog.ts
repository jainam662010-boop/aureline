/**
 * Static catalog snapshot for GitHub-Pages builds (STATIC_EXPORT=1).
 *
 * The dynamic app serves the catalog from Prisma; a static export has no
 * runtime, so this module mirrors the seeded catalog as committed data and
 * implements the same function signatures as src/lib/catalog.ts (they are
 * swapped in via a webpack alias in next.config.mjs during static builds).
 */
/* Mirrors the exported types of src/lib/catalog.ts so the two modules can be
 * swapped freely by the static build's tsconfig paths rewrite. */
export interface CatalogFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  fabric?: string;
  bestseller?: boolean;
  newArrival?: boolean;
  sort?: "popularity" | "price-asc" | "price-desc" | "newest";
  page?: number;
  perPage?: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  gsm: number;
  fabric: string;
  isBestseller: boolean;
  isNewArrival: boolean;
  popularity: number;
  category: { name: string; slug: string };
  colors: { name: string; hex: string }[];
  sizes: string[];
  image: string | null;
}

/* ------------------------------------------------------------------ data -- */

export interface StaticColor {
  name: string;
  hex: string;
  darkSurcharge: boolean;
}

const COLORS: StaticColor[] = [
  { name: "Onyx Black", hex: "#111111", darkSurcharge: true },
  { name: "Chalk White", hex: "#F4F4F4", darkSurcharge: false },
  { name: "Graphite", hex: "#3A3A3C", darkSurcharge: true },
  { name: "Sandstone", hex: "#B8A88F", darkSurcharge: false },
  { name: "Terracotta", hex: "#9E4A32", darkSurcharge: false },
  { name: "Forest", hex: "#3D4035", darkSurcharge: true },
  { name: "Steel Blue", hex: "#3B424C", darkSurcharge: true },
  { name: "Vintage Grey", hex: "#827D74", darkSurcharge: false },
  { name: "Burgundy", hex: "#6E2233", darkSurcharge: false },
  { name: "Natural Canvas", hex: "#E6DEC8", darkSurcharge: false },
];

const color = (name: string) => COLORS.find((c) => c.name === name)!;

const ADULT_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const KIDS_SIZES = ["2-3Y", "3-4Y", "5-6Y", "7-8Y", "9-10Y"];

export interface StaticCategory {
  id: string;
  name: string;
  slug: string;
  position: number;
  description: string;
  isActive: boolean;
  deletedAt: null;
}

export const CATEGORIES: StaticCategory[] = [
  { id: "c-tees", name: "Tees", slug: "tees", position: 0, description: "Heavyweight everyday box tees.", isActive: true, deletedAt: null },
  { id: "c-oversized", name: "Oversized", slug: "oversized", position: 1, description: "Garment-dyed drop-shoulder silhouettes.", isActive: true, deletedAt: null },
  { id: "c-hoodies", name: "Hoodies", slug: "hoodies", position: 2, description: "450 GSM French terry fleece.", isActive: true, deletedAt: null },
  { id: "c-polos", name: "Polos", slug: "polos", position: 3, description: "Structured piqué for teams and corporates.", isActive: true, deletedAt: null },
  { id: "c-kids", name: "Kids", slug: "kids", position: 4, description: "Shrink-tested combed cotton, sized 2–10Y.", isActive: true, deletedAt: null },
  { id: "c-totes", name: "Totes", slug: "totes", position: 5, description: "16 oz raw canvas merch totes.", isActive: true, deletedAt: null },
];

export interface StaticVariant {
  id: string;
  productId: string;
  size: string;
  colorName: string;
  colorHex: string;
  sku: string;
  stock: number;
  priceDelta: number;
  isActive: boolean;
}

export interface StaticProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  fabric: string;
  gsm: number;
  fit: string | null;
  careInstructions: string | null;
  categoryId: string;
  category: StaticCategory;
  basePrice: number;
  compareAtPrice: number | null;
  gstRate: number;
  weightGrams: number;
  status: "ACTIVE";
  isBestseller: boolean;
  isNewArrival: boolean;
  popularity: number;
  placementKeys: string[];
  variants: StaticVariant[];
  images: { id: string; url: string; alt: string | null; side: "FRONT" | "BACK"; colorHex: string | null; position: number }[];
  deletedAt: null;
}

interface ProductSeed {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  fabric: string;
  gsm: number;
  fit: string;
  careInstructions: string;
  categorySlug: string;
  basePrice: number;
  isBestseller: boolean;
  isNewArrival: boolean;
  popularity: number;
  placementKeys: string[];
  sizes: string[];
  colorNames: string[];
  weightGrams: number;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    name: "Heavyweight Box Tee",
    slug: "heavyweight-box-tee",
    tagline: "The blank that made the studio — print-flattening 240 GSM compact cotton.",
    description:
      "A truly boxy heavyweight tee milled from 240 GSM compact combed cotton. The dense knit flattens every print edge so fine type and gradients stay razor sharp through the cure. Bio-washed for a soft break-in feel and side-seamed so the silhouette holds wash after wash.",
    fabric: "100% Combed Compact Cotton",
    gsm: 240,
    fit: "Boxy, straight fall",
    careInstructions: "Machine wash cold, inside out. Tumble dry low. Do not iron directly on print.",
    categorySlug: "tees",
    basePrice: 520,
    isBestseller: true,
    isNewArrival: false,
    popularity: 980,
    placementKeys: ["chest", "full-front", "back-large", "back-small"],
    sizes: ADULT_SIZES,
    colorNames: COLORS.map((c) => c.name),
    weightGrams: 300,
  },
  {
    name: "Vintage Washed Oversized",
    slug: "vintage-washed-oversized",
    tagline: "Drop-shoulder, garment-dyed, every piece toned one shade apart.",
    description:
      "Garment-dyed ring-spun cotton in a drop-shoulder oversized cut. Because each piece is dyed after cutting, every blank carries its own subtle tone shift — the washed-out look streetwear labels chase. 280 GSM body with a soft, dry hand.",
    fabric: "Garment-Dyed Ring-Spun Cotton",
    gsm: 280,
    fit: "Oversized, drop shoulder",
    careInstructions: "Wash cold separately for first two washes. Do not bleach. Dry flat in shade.",
    categorySlug: "oversized",
    basePrice: 625,
    isBestseller: true,
    isNewArrival: false,
    popularity: 910,
    placementKeys: ["chest", "full-front", "back-large"],
    sizes: ADULT_SIZES,
    colorNames: ["Onyx Black", "Chalk White", "Graphite", "Sandstone", "Forest", "Steel Blue", "Vintage Grey", "Burgundy"],
    weightGrams: 340,
  },
  {
    name: "French Terry Hoodie",
    slug: "french-terry-hoodie",
    tagline: "450 GSM loopback fleece with a brushed interior. Cold-weather weight.",
    description:
      "Loopback cotton-poly French terry, brushed on the interior and built at a 450 GSM winter weight. Double-lined hood, ribbed cuffs that hold shape, and a chest print surface dense enough for high-detail DTF work.",
    fabric: "Cotton-Poly Loopback French Terry",
    gsm: 450,
    fit: "Regular, layered",
    careInstructions: "Machine wash cold, inside out. Tumble dry low. Warm iron on reverse.",
    categorySlug: "hoodies",
    basePrice: 825,
    isBestseller: false,
    isNewArrival: true,
    popularity: 840,
    placementKeys: ["chest", "full-front", "back-large"],
    sizes: ADULT_SIZES,
    colorNames: ["Onyx Black", "Chalk White", "Graphite", "Forest", "Steel Blue", "Burgundy", "Natural Canvas"],
    weightGrams: 640,
  },
  {
    name: "Structured Piqué Polo",
    slug: "structured-pique-polo",
    tagline: "Reinforced collar, breathable piqué. Corporate and team runs.",
    description:
      "Cotton piqué knit with a reinforced ribbed collar that refuses to curl. Breathable enough for all-day events and structured enough to hold a crisp left-chest logo. The blank our corporate and esports runs are built on.",
    fabric: "Cotton Piqué",
    gsm: 240,
    fit: "Structured regular",
    careInstructions: "Machine wash cold. Hang dry. Warm iron on reverse.",
    categorySlug: "polos",
    basePrice: 589,
    isBestseller: false,
    isNewArrival: false,
    popularity: 620,
    placementKeys: ["chest", "back-small"],
    sizes: ADULT_SIZES,
    colorNames: ["Onyx Black", "Chalk White", "Graphite", "Steel Blue", "Burgundy", "Natural Canvas"],
    weightGrams: 300,
  },
  {
    name: "Kids Essential Tee",
    slug: "kids-essential-tee",
    tagline: "Same combed cotton, sized 2–10Y. Shrink-tested twice.",
    description:
      "The heavyweight recipe scaled down for 2–10Y frames: 180 GSM pre-shrunk combed cotton, double-stitched hems and a tear-away label. Shrink-tested through two wash cycles so the fit you order is the fit they keep.",
    fabric: "100% Combed Cotton",
    gsm: 180,
    fit: "Everyday, straight",
    careInstructions: "Machine wash warm. Tumble dry low. Do not iron directly on print.",
    categorySlug: "kids",
    basePrice: 499,
    isBestseller: false,
    isNewArrival: false,
    popularity: 540,
    placementKeys: ["chest", "back-small"],
    sizes: KIDS_SIZES,
    colorNames: ["Chalk White", "Onyx Black", "Sandstone", "Terracotta", "Forest", "Steel Blue"],
    weightGrams: 190,
  },
  {
    name: "Raw Canvas Merch Tote",
    slug: "raw-canvas-merch-tote",
    tagline: "16 oz unbleached canvas, boxed base. Gig-ready.",
    description:
      "Unbleached 16 oz cotton canvas with a boxed base that stands on its own. Reinforced cross-stitched handles carry the full load, and the raw face takes a bold DTF print without any puckering. The merch-table workhorse.",
    fabric: "Unbleached 16 OZ Cotton Canvas",
    gsm: 540,
    fit: "One size",
    careInstructions: "Spot clean. Air dry only.",
    categorySlug: "totes",
    basePrice: 549,
    isBestseller: false,
    isNewArrival: true,
    popularity: 480,
    placementKeys: ["tote-front"],
    sizes: ["FREE"],
    colorNames: ["Natural Canvas", "Onyx Black"],
    weightGrams: 380,
  },
];

function buildProducts(): StaticProduct[] {
  return PRODUCT_SEEDS.map((seed) => {
    const category = CATEGORIES.find((c) => c.slug === seed.categorySlug)!;
    const variants: StaticVariant[] = [];
    for (const colorName of seed.colorNames) {
      const c = color(colorName);
      for (const size of seed.sizes) {
        const colorSlug = colorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        variants.push({
          id: `v-${seed.slug}-${colorSlug}-${size.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
          productId: `p-${seed.slug}`,
          size,
          colorName: c.name,
          colorHex: c.hex,
          sku: `${seed.slug.toUpperCase().replace(/-/g, "")}-${colorSlug.toUpperCase()}-${size.toUpperCase()}`,
          stock: 100,
          priceDelta: 0,
          isActive: true,
        });
      }
    }
    return {
      id: `p-${seed.slug}`,
      name: seed.name,
      slug: seed.slug,
      tagline: seed.tagline,
      description: seed.description,
      fabric: seed.fabric,
      gsm: seed.gsm,
      fit: seed.fit,
      careInstructions: seed.careInstructions,
      categoryId: category.id,
      category,
      basePrice: seed.basePrice,
      compareAtPrice: null,
      gstRate: 5,
      weightGrams: seed.weightGrams,
      status: "ACTIVE" as const,
      isBestseller: seed.isBestseller,
      isNewArrival: seed.isNewArrival,
      popularity: seed.popularity,
      placementKeys: seed.placementKeys,
      variants,
      images: [],
      deletedAt: null,
    };
  });
}

export const PRODUCTS: StaticProduct[] = buildProducts();

/** Print placements (mirrors prisma PrintPlacement seed rows). */
export interface StaticPlacement {
  id: string;
  key: string;
  label: string;
  side: "FRONT" | "BACK";
  widthIn: number;
  heightIn: number;
  topPct: number;
  leftPct: number;
  baseCost: number;
  surcharge: number;
  isActive: boolean;
  position: number;
}

export const PLACEMENTS: StaticPlacement[] = [
  { id: "pl-chest", key: "chest", label: "Front chest", side: "FRONT", widthIn: 10, heightIn: 12, topPct: 30, leftPct: 32, baseCost: 149, surcharge: 30, isActive: true, position: 0 },
  { id: "pl-full-front", key: "full-front", label: "Full front", side: "FRONT", widthIn: 12, heightIn: 16, topPct: 27, leftPct: 26, baseCost: 249, surcharge: 40, isActive: true, position: 1 },
  { id: "pl-back-large", key: "back-large", label: "Large back", side: "BACK", widthIn: 12, heightIn: 16, topPct: 27, leftPct: 26, baseCost: 249, surcharge: 40, isActive: true, position: 2 },
  { id: "pl-back-small", key: "back-small", label: "Upper back", side: "BACK", widthIn: 8, heightIn: 6, topPct: 28, leftPct: 35, baseCost: 129, surcharge: 25, isActive: true, position: 3 },
  { id: "pl-tote-front", key: "tote-front", label: "Tote face", side: "FRONT", widthIn: 11, heightIn: 12, topPct: 40, leftPct: 26, baseCost: 149, surcharge: 30, isActive: true, position: 4 },
];

/** Quantity tiers (mirrors prisma QuantityDiscount seed rows). */
export const QUANTITY_TIERS: { minQty: number; maxQty: number | null; percentOff: number }[] = [
  { minQty: 1, maxQty: 4, percentOff: 0 },
  { minQty: 5, maxQty: 9, percentOff: 8 },
  { minQty: 10, maxQty: 24, percentOff: 15 },
  { minQty: 25, maxQty: 49, percentOff: 22 },
  { minQty: 50, maxQty: 99, percentOff: 30 },
  { minQty: 100, maxQty: null, percentOff: 38 },
];

/** Coupons (mirrors prisma Coupon seed rows). */
export const COUPONS: { code: string; type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"; value: number; minOrderAmount: number; maxDiscountAmount: number | null }[] = [
  { code: "WELCOME100", type: "FIXED", value: 100, minOrderAmount: 499, maxDiscountAmount: null },
  { code: "DROP15", type: "PERCENTAGE", value: 15, minOrderAmount: 1499, maxDiscountAmount: 800 },
  { code: "FREESHIP", type: "FREE_SHIPPING", value: 0, minOrderAmount: 0, maxDiscountAmount: null },
];

export const SETTINGS = {
  defaultGstRate: 18,
  defaultShippingFee: 79,
  freeShippingThreshold: 1499,
  printRatePerSqIn: 1.35,
  printMinimum: 99,
};

/* -------------------------------------------------------- catalog API ---- */

function toItem(p: StaticProduct): ProductListItem {
  const colorMap = new Map<string, { name: string; hex: string }>();
  p.variants.forEach((v) => {
    if (!colorMap.has(v.colorHex)) colorMap.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
  });
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    basePrice: p.basePrice,
    compareAtPrice: p.compareAtPrice,
    gsm: p.gsm,
    fabric: p.fabric,
    isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival,
    popularity: p.popularity,
    category: { name: p.category.name, slug: p.category.slug },
    colors: [...colorMap.values()],
    sizes: [...new Set(p.variants.map((v) => v.size))],
    image: null,
  };
}

const contains = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

export async function listProducts(filters: CatalogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, Math.max(1, filters.perPage ?? 12));

  let items = PRODUCTS.filter((p) => {
    if (filters.category && p.category.slug !== filters.category) return false;
    if (filters.bestseller && !p.isBestseller) return false;
    if (filters.newArrival && !p.isNewArrival) return false;
    if (filters.fabric && !contains(p.fabric, filters.fabric)) return false;
    if (filters.minPrice !== undefined && p.basePrice < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.basePrice > filters.maxPrice) return false;
    if (filters.size && !p.variants.some((v) => v.size === filters.size)) return false;
    if (filters.color && !p.variants.some((v) => v.colorHex.toUpperCase() === filters.color!.toUpperCase())) return false;
    if (filters.q) {
      const inName = contains(p.name, filters.q);
      const inDesc = contains(p.description, filters.q);
      const inTag = contains(p.tagline ?? "", filters.q);
      const inCategory = contains(p.category.name, filters.q);
      const inFabric = contains(p.fabric, filters.q);
      if (!inName && !inDesc && !inTag && !inCategory && !inFabric) return false;
    }
    return true;
  });

  items = [...items].sort((a, b) =>
    filters.sort === "price-asc"
      ? a.basePrice - b.basePrice
      : filters.sort === "price-desc"
        ? b.basePrice - a.basePrice
        : filters.sort === "newest"
          ? b.id.localeCompare(a.id)
          : b.popularity - a.popularity,
  );

  const total = items.length;
  const paged = items.slice((page - 1) * perPage, page * perPage);

  return {
    items: paged.map(toItem),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug && p.status === "ACTIVE" && p.deletedAt === null) ?? null;
}

/** Used by /design/[productId] deep links in static builds. */
export async function getProductById(id: string) {
  return PRODUCTS.find((p) => p.id === id && p.status === "ACTIVE" && p.deletedAt === null) ?? null;
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  return PRODUCTS.filter((p) => p.id !== productId && p.categoryId === categoryId)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map(toItem);
}

export async function getFeaturedProducts(limit = 4) {
  const result = await listProducts({ sort: "popularity", perPage: limit });
  return result.items;
}

export async function listCategories() {
  const sorted = [...CATEGORIES].sort((a, b) => a.position - b.position);
  return sorted.map((c) => ({
    ...c,
    _count: { products: PRODUCTS.filter((p) => p.categoryId === c.id).length },
  }));
}

export async function getCatalogFacets() {
  const colorMap = new Map<string, { name: string; hex: string }>();
  PRODUCTS.forEach((p) =>
    p.variants.forEach((v) => {
      if (!colorMap.has(v.colorHex)) colorMap.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
    }),
  );
  return {
    colors: [...colorMap.values()],
    sizes: [...new Set(PRODUCTS.flatMap((p) => p.variants.map((v) => v.size)))],
    fabrics: [...new Set(PRODUCTS.map((p) => p.fabric))],
  };
}
