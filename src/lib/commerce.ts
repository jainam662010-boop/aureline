import "server-only";
import type { Prisma, Product, ProductVariant, PrintPlacement, Coupon, ShippingMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computePricing, validateCoupon, type PriceBreakdown, type QuantityTier, type CouponInput, type ShippingInput, type PrintPricingInput } from "@/lib/pricing";
import { designPrintArea } from "@/lib/print-area";
import { blankUnitPrice } from "@/lib/price-list";
import { num, parseJson } from "@/lib/utils";
import type { DesignDocument, PrintSideKey } from "@/lib/editor-types";

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export interface SiteSettings {
  defaultGstRate: number;
  defaultShippingFee: number;
  freeShippingThreshold: number;
  /** ₹ per square inch of printed artwork. */
  printRatePerSqIn: number;
  /** ₹ floor for any single print. */
  printMinimum: number;
}

const SETTING_KEYS = [
  "defaultGstRate",
  "defaultShippingFee",
  "freeShippingThreshold",
  "printRatePerSqIn",
  "printMinimum",
] as const;

let settingsCache: { value: SiteSettings; at: number } | null = null;

export async function getSettings(): Promise<SiteSettings> {
  if (settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache.value;
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const value: SiteSettings = {
    defaultGstRate: Number(map.get("defaultGstRate") ?? process.env.DEFAULT_GST_RATE ?? 18),
    defaultShippingFee: Number(map.get("defaultShippingFee") ?? process.env.DEFAULT_SHIPPING_FEE ?? 79),
    freeShippingThreshold: Number(map.get("freeShippingThreshold") ?? process.env.FREE_SHIPPING_THRESHOLD ?? 1499),
    printRatePerSqIn: Number(map.get("printRatePerSqIn") ?? process.env.PRINT_RATE_PER_SQ_IN ?? 1.35),
    printMinimum: Number(map.get("printMinimum") ?? process.env.PRINT_MINIMUM_CHARGE ?? 99),
  };
  settingsCache = { value, at: Date.now() };
  return value;
}

export function invalidateSettingsCache() {
  settingsCache = null;
}

/* -------------------------------------------------------------------------- */
/* Catalog helpers                                                             */
/* -------------------------------------------------------------------------- */

export type ProductWithRelations = Product & {
  variants: ProductVariant[];
  images: { id: string; url: string; alt: string | null; side: string; colorHex: string | null; position: number }[];
  category: { id: string; name: string; slug: string };
};

/** Print placements available for a product (global or product-restricted). */
export async function getPlacementsForProduct(product: Product): Promise<PrintPlacement[]> {
  const allowed = parseJson<string[]>(product.placementKeys, []);
  const rows = await prisma.printPlacement.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
  const filtered = rows.filter((p) => {
    if (Array.isArray(allowed) && allowed.length > 0) return allowed.includes(p.key);
    return true;
  });
  return filtered.length > 0 ? filtered : rows;
}

export async function getQuantityTiers(): Promise<QuantityTier[]> {
  const rows = await prisma.quantityDiscount.findMany({ where: { isActive: true }, orderBy: { minQty: "asc" } });
  return rows.map((r) => ({ minQty: r.minQty, maxQty: r.maxQty, percentOff: num(r.percentOff) }));
}

/* -------------------------------------------------------------------------- */
/* Shipping                                                                    */
/* -------------------------------------------------------------------------- */

export interface ResolvedShipping extends ShippingInput {
  etaDays: number;
  zoneName: string | null;
}

export async function resolveShipping(
  method: ShippingMethod,
  pincode?: string | null,
): Promise<ResolvedShipping> {
  const settings = await getSettings();
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    include: { rates: { where: { isActive: true } } },
    orderBy: { position: "asc" },
  });

  const digits = (pincode ?? "").replace(/\D/g, "");
  let matched = null as { zone: { name: string }; rate: (typeof zones)[number]["rates"][number] } | null;

  for (const zone of zones) {
    const list = parseJson<string[]>(zone.pincodes, []);
    const hit = (list as string[]).some((p) => p && digits.startsWith(String(p)));
    const rate = zone.rates.find((r) => r.method === method);
    if (hit && rate) {
      matched = { zone, rate };
      break;
    }
  }

  if (!matched) {
    const anyZone = zones.flatMap((z) => z.rates.filter((r) => r.method === method).map((rate) => ({ zone: z, rate })))[0];
    if (anyZone) matched = anyZone;
  }

  if (!matched) {
    return {
      baseFee: settings.defaultShippingFee,
      perItemFee: 0,
      freeAbove: settings.freeShippingThreshold > 0 ? settings.freeShippingThreshold : null,
      method,
      etaDays: method === "EXPRESS" ? 3 : 6,
      zoneName: null,
    };
  }

  return {
    baseFee: num(matched.rate.baseFee),
    perItemFee: num(matched.rate.perItemFee),
    freeAbove: matched.rate.freeAbove !== null ? num(matched.rate.freeAbove) : settings.freeShippingThreshold > 0 ? settings.freeShippingThreshold : null,
    method,
    etaDays: matched.rate.etaDays,
    zoneName: matched.zone.name,
  };
}

/* -------------------------------------------------------------------------- */
/* Item pricing                                                                */
/* -------------------------------------------------------------------------- */

export interface ItemPricingInput {
  product: { basePrice: Prisma.Decimal | number | string; gstRate: Prisma.Decimal | number | string; slug?: string | null };
  variant?: { priceDelta: Prisma.Decimal | number | string } | null;
  placement?: PrintPlacement | null;
  /** Design document attached to the line (drives per-square-inch pricing). */
  designJson?: unknown;
  /** Which side of the design this line prints. */
  side?: PrintSideKey | string | null;
  settings?: SiteSettings;
  quantity: number;
  coupon?: (Coupon & { deletedAt: Date | null }) | null;
  couponCode?: string | null;
  shipping?: ResolvedShipping | null;
  tiers?: QuantityTier[];
}

export async function priceItem(input: ItemPricingInput): Promise<PriceBreakdown> {
  const settings = input.settings ?? (await getSettings());
  let couponInput: CouponInput | null = null;
  if (input.coupon) {
    const check = validateCoupon(input.coupon, 0);
    if (check.valid || input.coupon.type === "FREE_SHIPPING") {
      couponInput = {
        type: input.coupon.type,
        value: num(input.coupon.value),
        minOrderAmount: num(input.coupon.minOrderAmount),
        maxDiscountAmount: input.coupon.maxDiscountAmount !== null ? num(input.coupon.maxDiscountAmount) : null,
        productIds: parseJson<string[]>(input.coupon.productIds, []),
        categoryIds: parseJson<string[]>(input.coupon.categoryIds, []),
      };
    }
  }

  // Price by the artwork's bounding box when a design is attached. Catalogue
  // quick-adds have no design, so they use the placement's full rectangle.
  const side = (input.side ?? input.placement?.side ?? "FRONT") as PrintSideKey;
  const placementWidthIn = input.placement ? num(input.placement.widthIn) : 0;
  const placementHeightIn = input.placement ? num(input.placement.heightIn) : 0;
  const printArea =
    input.placement && placementWidthIn > 0 && placementHeightIn > 0
      ? input.designJson
        ? designPrintArea(input.designJson as DesignDocument, side, {
            widthIn: placementWidthIn,
            heightIn: placementHeightIn,
          })
        : { areaSqIn: placementWidthIn * placementHeightIn }
      : null;

  const printPricing: PrintPricingInput = {
    ratePerSqIn: settings.printRatePerSqIn,
    minimum: settings.printMinimum,
  };

  return computePricing(
    {
      basePrice: num(input.product.basePrice),
      blankPriceForQty: input.product.slug
        ? blankUnitPrice(input.product.slug, input.quantity, num(input.product.basePrice))
        : null,
      priceDelta: num(input.variant?.priceDelta ?? 0),
      placementBaseCost: num(input.placement?.baseCost ?? 0),
      placementSurcharge: num(input.placement?.surcharge ?? 0),
      printAreaSqIn: printArea?.areaSqIn ?? null,
      gstRate: num(input.product.gstRate ?? 0),
      quantity: input.quantity,
    },
    {
      coupon: couponInput,
      couponCode: input.coupon?.code ?? null,
      shipping: input.shipping ?? null,
      tiers: input.tiers ?? [],
      printPricing,
    },
  );
}

export async function findCoupon(code: string | null | undefined) {
  if (!code) return null;
  return prisma.coupon.findFirst({
    where: { code: code.toUpperCase().trim(), deletedAt: null },
  });
}
