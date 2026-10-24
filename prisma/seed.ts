/**
 * Seed the local development database.
 *
 * Run:  npx tsx prisma/seed.ts      (or npm run db:seed)
 *
 * Idempotent — every write is an upsert keyed on a natural unique field, so you
 * can re-run it after changing the data without duplicating rows.
 *
 * NOTE: the Prisma `PrintSide` enum is FRONT | BACK only. Sleeve placements
 * exist in the studio's client-side geometry (src/lib/garment.ts) but have no
 * enum member here, so nothing below writes a SLEEVE placement. See the README
 * "Sleeve prints" note.
 */

import { PrismaClient, Prisma, Role, ProductStatus, PrintSide, ShippingMethod, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */

const CATEGORIES = [
  { name: "Tees", slug: "tees", description: "Boxy and regular fit tees, 180–240 GSM combed cotton.", position: 0 },
  { name: "Oversized", slug: "oversized", description: "Drop-shoulder oversized cuts, garment-dyed washes.", position: 1 },
  { name: "Hoodies", slug: "hoodies", description: "French terry and fleece hoodies for cold-weather drops.", position: 2 },
  { name: "Polos", slug: "polos", description: "Structured piqué polos with reinforced collars.", position: 3 },
  { name: "Kids", slug: "kids", description: "Same combed cotton, sized 2–10Y, shrink-tested.", position: 4 },
  { name: "Totes", slug: "totes", description: "Heavy canvas merch totes with boxed bases.", position: 5 },
] as const;

const COLORS = [
  { name: "Onyx Black", hex: "#111111" },
  { name: "Chalk White", hex: "#F4F4F4" },
  { name: "Graphite", hex: "#3A3A3C" },
  { name: "Sandstone", hex: "#B8A88F" },
  { name: "Terracotta", hex: "#9E4A32" },
  { name: "Forest", hex: "#3D4035" },
  { name: "Steel Blue", hex: "#3B424C" },
  { name: "Vintage Grey", hex: "#827D74" },
  { name: "Burgundy", hex: "#6E2233" },
  { name: "Natural Canvas", hex: "#E6DEC8" },
];

const ADULT_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const KIDS_SIZES = ["2-3Y", "3-4Y", "5-6Y", "7-8Y", "9-10Y"];

interface SeedProduct {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  categorySlug: string;
  fabric: string;
  gsm: number;
  fit: string;
  care: string;
  basePrice: number;
  gstRate: number;
  weightGrams: number;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  sizes: string[];
  colorCount: number;
  placementKeys: string[];
}

const PRODUCTS: SeedProduct[] = [
  {
    name: "Heavyweight Box Tee",
    slug: "heavyweight-box-tee",
    tagline: "The blank that made us. Structured, side-seamed, print-flattening.",
    description:
      "Our house blank. 240 GSM compact combed cotton, side-seamed for a structured drape that holds a print flat with no torque after washing. Bio-washed for a soft hand-feel from the first wear.",
    categorySlug: "tees",
    fabric: "100% compact combed cotton, bio-washed, side-seamed",
    gsm: 240,
    fit: "Boxy, true to size",
    care: "Machine wash cold inside out. Do not iron directly on print.",
    basePrice: 649,
    gstRate: 5,
    weightGrams: 300,
    isBestseller: true,
    sizes: ADULT_SIZES,
    colorCount: 10,
    placementKeys: ["chest", "full-front", "back-large", "back-small"],
  },
  {
    name: "Vintage Washed Oversized",
    slug: "vintage-washed-oversized",
    tagline: "Drop-shoulder, garment-dyed, every piece toned one shade apart.",
    description:
      "Garment-dyed ring-spun cotton with a broken-in vintage finish. Drop shoulders, ribbed cuffs and a boxy body. Because every piece is dyed after cutting, tones vary slightly between units — that's the point.",
    categorySlug: "oversized",
    fabric: "Garment-dyed ring-spun cotton",
    gsm: 280,
    fit: "Oversized drop-shoulder",
    care: "Machine wash cold inside out. Hang dry to preserve the wash tone.",
    basePrice: 999,
    gstRate: 5,
    weightGrams: 380,
    isBestseller: true,
    sizes: ADULT_SIZES,
    colorCount: 8,
    placementKeys: ["chest", "full-front", "back-large"],
  },
  {
    name: "French Terry Hoodie",
    slug: "french-terry-hoodie",
    tagline: "450 GSM loopback fleece with a brushed interior. Cold-weather weight.",
    description:
      "Dense 450 GSM French terry with a brushed interior and a double-lined hood. Kangaroo pocket, ribbed cuffs and hem. Built for tour merch and winter drops that need to feel substantial.",
    categorySlug: "hoodies",
    fabric: "Loopback cotton-poly French terry, brushed interior",
    gsm: 450,
    fit: "Relaxed",
    care: "Machine wash cold inside out. Do not iron directly on print.",
    basePrice: 1799,
    gstRate: 5,
    weightGrams: 620,
    isNewArrival: true,
    sizes: ADULT_SIZES,
    colorCount: 7,
    placementKeys: ["chest", "full-front", "back-large"],
  },
  {
    name: "Structured Piqué Polo",
    slug: "structured-pique-polo",
    tagline: "Reinforced collar, breathable piqué. Corporate and team runs.",
    description:
      "Breathable cotton piqué with a reinforced collar that holds its shape through repeated washing. Two-button placket, side vents. The standard blank for corporate and team orders.",
    categorySlug: "polos",
    fabric: "Cotton piqué, reinforced ribbed collar",
    gsm: 240,
    fit: "Regular",
    care: "Machine wash cold. Reshape collar while damp.",
    basePrice: 1099,
    gstRate: 5,
    weightGrams: 280,
    sizes: ADULT_SIZES,
    colorCount: 6,
    placementKeys: ["chest", "back-small"],
  },
  {
    name: "Kids Essential Tee",
    slug: "kids-essential-tee",
    tagline: "Same combed cotton, sized 2–10Y. Shrink-tested through 40 washes.",
    description:
      "The heavyweight box tee pattern scaled for kids, in the same combed cotton. Pre-shrunk and tested through forty wash cycles so the print and the fit both survive nursery and school.",
    categorySlug: "kids",
    fabric: "100% combed cotton, pre-shrunk",
    gsm: 180,
    fit: "Regular",
    care: "Machine wash cold inside out.",
    basePrice: 499,
    gstRate: 5,
    weightGrams: 190,
    sizes: KIDS_SIZES,
    colorCount: 6,
    placementKeys: ["chest", "back-small"],
  },
  {
    name: "Raw Canvas Merch Tote",
    slug: "raw-canvas-merch-tote",
    tagline: "16 OZ unbleached canvas, boxed base, boxed handles. Gig-ready.",
    description:
      "16 OZ unbleached cotton canvas with a boxed base and boxed handles that sit flat on the shoulder. Prints sit proud on the coarse weave — the carry choice for record stores and gig merch.",
    categorySlug: "totes",
    fabric: "Unbleached 16 OZ cotton canvas",
    gsm: 540,
    fit: "One size",
    care: "Spot clean or machine wash cold, air dry.",
    basePrice: 549,
    gstRate: 5,
    weightGrams: 260,
    isNewArrival: true,
    sizes: ["FREE"],
    colorCount: 2,
    placementKeys: ["tote-front"],
  },
];

/* Placement geometry matches src/lib/garment.ts so the studio preview and the
   database agree on where each print sits on the garment. */
const PLACEMENTS = [
  { key: "chest", label: "Front chest", side: PrintSide.FRONT, widthIn: 10, heightIn: 12, topPct: 30, leftPct: 32, baseCost: 149, surcharge: 30, position: 0 },
  { key: "full-front", label: "Full front", side: PrintSide.FRONT, widthIn: 12, heightIn: 16, topPct: 27, leftPct: 26, baseCost: 249, surcharge: 40, position: 1 },
  { key: "back-large", label: "Large back", side: PrintSide.BACK, widthIn: 12, heightIn: 16, topPct: 27, leftPct: 26, baseCost: 249, surcharge: 40, position: 2 },
  { key: "back-small", label: "Upper back", side: PrintSide.BACK, widthIn: 8, heightIn: 6, topPct: 28, leftPct: 35, baseCost: 129, surcharge: 25, position: 3 },
  { key: "tote-front", label: "Tote face", side: PrintSide.FRONT, widthIn: 11, heightIn: 12, topPct: 40, leftPct: 26, baseCost: 149, surcharge: 30, position: 4 },
] as const;

const QUANTITY_TIERS = [
  { label: "1–4 pieces", minQty: 1, maxQty: 4, percentOff: 0 },
  { label: "5–9 pieces", minQty: 5, maxQty: 9, percentOff: 8 },
  { label: "10–24 pieces", minQty: 10, maxQty: 24, percentOff: 15 },
  { label: "25–49 pieces", minQty: 25, maxQty: 49, percentOff: 22 },
  { label: "50–99 pieces", minQty: 50, maxQty: 99, percentOff: 30 },
  { label: "100+ pieces", minQty: 100, maxQty: null, percentOff: 38 },
];

/* -------------------------------------------------------------------------- */

/* Launch coupons so the cart/checkout coupon flow has something to try in dev.
   productIds/categoryIds empty = applies to the whole cart. */
const COUPONS = [
  {
    code: "WELCOME100",
    description: "₹100 off your first Aureline order.",
    type: CouponType.FIXED,
    value: 100,
    minOrderAmount: 499,
    maxDiscountAmount: null,
    endsAt: null,
    usageLimit: null,
    perUserLimit: 1,
  },
  {
    code: "DROP15",
    description: "15% off orders above ₹1,499.",
    type: CouponType.PERCENTAGE,
    value: 15,
    minOrderAmount: 1499,
    maxDiscountAmount: 800,
    endsAt: null,
    usageLimit: null,
    perUserLimit: null,
  },
  {
    code: "FREESHIP",
    description: "Free standard shipping on any order.",
    type: CouponType.FREE_SHIPPING,
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: null,
    endsAt: null,
    usageLimit: null,
    perUserLimit: null,
  },
] as const;

async function seedCoupons() {
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        description: c.description, type: c.type, value: c.value,
        minOrderAmount: c.minOrderAmount, maxDiscountAmount: c.maxDiscountAmount,
        startsAt: null, endsAt: c.endsAt, usageLimit: c.usageLimit,
        perUserLimit: c.perUserLimit, isActive: true, deletedAt: null,
      },
      create: {
        code: c.code, description: c.description, type: c.type, value: c.value,
        minOrderAmount: c.minOrderAmount, maxDiscountAmount: c.maxDiscountAmount,
        endsAt: c.endsAt, usageLimit: c.usageLimit, perUserLimit: c.perUserLimit,
        productIds: [], categoryIds: [],
      },
    });
  }
  console.log(`  coupons         ${COUPONS.length}`);
}

/* -------------------------------------------------------------------------- */

async function seedSettings() {
  const rows: { key: string; value: unknown }[] = [
    { key: "defaultGstRate", value: Number(process.env.DEFAULT_GST_RATE ?? 18) },
    { key: "defaultShippingFee", value: Number(process.env.DEFAULT_SHIPPING_FEE ?? 79) },
    { key: "freeShippingThreshold", value: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 1499) },
  ];
  for (const row of rows) {
    await prisma.setting.upsert({
      where: { key: row.key },
      update: { value: row.value as Prisma.InputJsonValue },
      create: { key: row.key, value: row.value as Prisma.InputJsonValue },
    });
  }
  console.log(`  settings        ${rows.length}`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@aureline.in";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, isActive: true },
    create: { email, name: "Aureline Admin", passwordHash, role: Role.ADMIN, emailVerified: new Date() },
  });
  console.log(`  admin user      ${email}`);
}

async function seedPlacements() {
  for (const p of PLACEMENTS) {
    await prisma.printPlacement.upsert({
      where: { key: p.key },
      update: {
        label: p.label, side: p.side, widthIn: p.widthIn, heightIn: p.heightIn,
        topPct: p.topPct, leftPct: p.leftPct, baseCost: p.baseCost,
        surcharge: p.surcharge, position: p.position, isActive: true,
      },
      create: {
        key: p.key, label: p.label, side: p.side, widthIn: p.widthIn, heightIn: p.heightIn,
        topPct: p.topPct, leftPct: p.leftPct, baseCost: p.baseCost,
        surcharge: p.surcharge, position: p.position, productIds: [],
      },
    });
  }
  console.log(`  placements      ${PLACEMENTS.length}`);
}

async function seedTiers() {
  for (const t of QUANTITY_TIERS) {
    await prisma.quantityDiscount.upsert({
      where: { id: `${t.minQty}-${t.maxQty ?? "inf"}` },
      update: { label: t.label, percentOff: t.percentOff, isActive: true },
      create: { id: `${t.minQty}-${t.maxQty ?? "inf"}`, label: t.label, minQty: t.minQty, maxQty: t.maxQty, percentOff: t.percentOff },
    });
  }
  console.log(`  quantity tiers  ${QUANTITY_TIERS.length}`);
}

async function seedShipping() {
  const zones = [
    { name: "Metro (DEL · BLR · MUM · HYD · CHN · KOL)", pincodes: ["110", "122", "560", "600", "400", "500", "700"] },
    { name: "Rest of India", pincodes: [] },
  ];
  for (const [i, z] of zones.entries()) {
    const zone = await prisma.shippingZone.upsert({
      where: { id: `zone-${i}` },
      update: { name: z.name, pincodes: z.pincodes, isActive: true, position: i },
      create: { id: `zone-${i}`, name: z.name, pincodes: z.pincodes, position: i },
    });
    const rates: { method: ShippingMethod; baseFee: number; perItemFee: number; freeAbove: number | null; etaDays: number }[] =
      i === 0
        ? [
            { method: ShippingMethod.STANDARD, baseFee: 79, perItemFee: 20, freeAbove: 1999, etaDays: 4 },
            { method: ShippingMethod.EXPRESS, baseFee: 149, perItemFee: 35, freeAbove: null, etaDays: 2 },
          ]
        : [
            { method: ShippingMethod.STANDARD, baseFee: 99, perItemFee: 25, freeAbove: 2499, etaDays: 6 },
            { method: ShippingMethod.EXPRESS, baseFee: 179, perItemFee: 40, freeAbove: null, etaDays: 3 },
          ];
    for (const r of rates) {
      await prisma.shippingRate.upsert({
        where: { zoneId_method: { zoneId: zone.id, method: r.method } },
        update: { baseFee: r.baseFee, perItemFee: r.perItemFee, freeAbove: r.freeAbove, etaDays: r.etaDays, isActive: true },
        create: { zoneId: zone.id, method: r.method, baseFee: r.baseFee, perItemFee: r.perItemFee, freeAbove: r.freeAbove, etaDays: r.etaDays },
      });
    }
  }
  console.log(`  shipping zones  ${zones.length}`);
}

async function seedCatalog() {
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, position: c.position, isActive: true },
      create: { name: c.name, slug: c.slug, description: c.description, position: c.position },
    });
    categories.set(c.slug, row.id);
  }
  console.log(`  categories      ${categories.size}`);

  let variantCount = 0;
  for (const p of PRODUCTS) {
    const categoryId = categories.get(p.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${p.categorySlug}`);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name, tagline: p.tagline, description: p.description, categoryId,
        fabric: p.fabric, gsm: p.gsm, fit: p.fit, careInstructions: p.care,
        basePrice: p.basePrice, gstRate: p.gstRate, weightGrams: p.weightGrams,
        status: ProductStatus.ACTIVE, isBestseller: p.isBestseller ?? false,
        isNewArrival: p.isNewArrival ?? false, placementKeys: p.placementKeys,
      },
      create: {
        name: p.name, slug: p.slug, tagline: p.tagline, description: p.description, categoryId,
        fabric: p.fabric, gsm: p.gsm, fit: p.fit, careInstructions: p.care,
        basePrice: p.basePrice, gstRate: p.gstRate, weightGrams: p.weightGrams,
        status: ProductStatus.ACTIVE, isBestseller: p.isBestseller ?? false,
        isNewArrival: p.isNewArrival ?? false, placementKeys: p.placementKeys,
      },
    });

    for (const color of COLORS.slice(0, p.colorCount)) {
      for (const size of p.sizes) {
        const sku = `${p.slug.slice(0, 3).toUpperCase()}-${color.hex.replace("#", "").slice(0, 4).toUpperCase()}-${size.replace(/[^A-Za-z0-9]/g, "")}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: { stock: 100, isActive: true, colorName: color.name, colorHex: color.hex, size },
          create: { productId: product.id, sku, size, colorName: color.name, colorHex: color.hex, stock: 100, priceDelta: 0 },
        });
        variantCount++;
      }
    }
  }
  console.log(`  products        ${PRODUCTS.length}`);
  console.log(`  variants        ${variantCount}`);
}

/* -------------------------------------------------------------------------- */

async function main() {
  console.log("Seeding Aureline dev database…");
  await seedSettings();
  await seedAdmin();
  await seedPlacements();
  await seedTiers();
  await seedShipping();
  await seedCoupons();
  await seedCatalog();
  console.log("\nDone. Sign in as " + (process.env.SEED_ADMIN_EMAIL ?? "admin@aureline.in") + " / " + (process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
