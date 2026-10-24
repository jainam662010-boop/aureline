/**
 * Static commerce snapshot for GitHub-Pages builds (STATIC_EXPORT=1).
 *
 * Mirrors the exported functions of src/lib/commerce.ts using the committed
 * static catalog data — swapped in via a webpack alias during static builds.
 * Kept free of "server-only" so prerender and client bundles can both load it.
 */
import {
  PLACEMENTS,
  QUANTITY_TIERS,
  COUPONS,
  SETTINGS,
  type StaticPlacement,
} from "@/lib/static-catalog";
import { computePricing, round2 } from "@/lib/pricing";

export interface CommerceSettings {
  defaultGstRate: number;
  defaultShippingFee: number;
  freeShippingThreshold: number;
}

export async function getSettings(): Promise<CommerceSettings> {
  return { ...SETTINGS };
}

export function invalidateSettingsCache(): void {
  /* no cache in the static snapshot */
}

export async function getPlacementsForProduct(product: { placementKeys?: unknown }): Promise<StaticPlacement[]> {
  const keys = Array.isArray(product.placementKeys) ? (product.placementKeys as string[]) : [];
  const filtered = keys.length > 0 ? PLACEMENTS.filter((p) => keys.includes(p.key)) : [...PLACEMENTS];
  return filtered.length > 0 ? filtered : [...PLACEMENTS];
}

export async function getQuantityTiers() {
  return QUANTITY_TIERS.map((t) => ({ ...t }));
}

export interface ShippingQuote {
  baseFee: number;
  perItemFee: number;
  freeAbove: number | null;
  method: "STANDARD" | "EXPRESS" | "PICKUP";
  etaDays: number;
  zoneName: string;
}

/** Mirrors the seeded ShippingZone rows: Metro + Rest of India. */
export async function resolveShipping(method: "STANDARD" | "EXPRESS" | "PICKUP", pincode?: string | null): Promise<ShippingQuote> {
  if (method === "PICKUP") {
    return { baseFee: 0, perItemFee: 0, freeAbove: null, method: "PICKUP", etaDays: 0, zoneName: "Store pickup" };
  }
  const prefix = (pincode ?? "").slice(0, 3);
  const metro = ["110", "122", "560", "600", "400", "500", "700"].includes(prefix);
  const zoneName = metro ? "Metro (DEL·BLR·MUM·HYD·CHN·KOL)" : "Rest of India";
  if (method === "EXPRESS") {
    return metro
      ? { baseFee: 149, perItemFee: 35, freeAbove: null, method, etaDays: 2, zoneName }
      : { baseFee: 179, perItemFee: 40, freeAbove: null, method, etaDays: 3, zoneName };
  }
  return metro
    ? { baseFee: SETTINGS.defaultShippingFee, perItemFee: 20, freeAbove: 1999, method, etaDays: 4, zoneName }
    : { baseFee: 99, perItemFee: 25, freeAbove: 2499, method, etaDays: 6, zoneName };
}

export async function findCoupon(code: string | null | undefined) {
  if (!code) return null;
  const coupon = COUPONS.find((c) => c.code === code.toUpperCase().trim());
  if (!coupon) return null;
  return {
    ...coupon,
    id: `coupon_${coupon.code.toLowerCase()}`,
    description: null as string | null,
    usageLimit: null as number | null,
    usedCount: 0,
    perUserLimit: null as number | null,
    productIds: [] as string[],
    categoryIds: [] as string[],
    isActive: true,
    deletedAt: null as Date | null,
    startsAt: null as Date | null,
    endsAt: null as Date | null,
  };
}

/**
 * Delegates to the shared computePricing helper so the static demo quotes
 * prices with exactly the same math (tiers, GST, free-shipping) as production.
 */
export async function priceItem(input: {
  product?: { basePrice: number | string | { toNumber(): number }; gstRate: number | string | { toNumber(): number }; priceDelta?: number | string | { toNumber(): number } };
  placement?: { baseCost: number | string | { toNumber(): number }; surcharge: number | string | { toNumber(): number } };
  variant?: { priceDelta: number | string | { toNumber(): number } };
  quantity: number;
  coupon?: { type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"; value: number | string | { toNumber(): number }; minOrderAmount: number | string | { toNumber(): number }; maxDiscountAmount: number | string | { toNumber(): number } | null } | null;
  couponCode?: string | null;
  shipping?: { baseFee: number | string | { toNumber(): number }; perItemFee: number | string | { toNumber(): number }; freeAbove: number | string | { toNumber(): number } | null; method: string } | null;
  basePrice?: number | string | { toNumber(): number };
  gstRate?: number | string | { toNumber(): number };
  priceDelta?: number | string | { toNumber(): number };
  placementBaseCost?: number | string | { toNumber(): number };
  placementSurcharge?: number | string | { toNumber(): number };
  /** Mirrors ItemPricingInput.tiers on the live data layer. */
  tiers?: { minQty: number; maxQty: number | null; percentOff: number }[];
}) {
  // Decimal-like columns only reach this shim in static builds, where data is
  // already numeric — normalise everything through Number().
  return computePricing(
    {
      basePrice: round2(Number(input.product?.basePrice ?? input.basePrice ?? 0)),
      priceDelta: round2(Number(input.variant?.priceDelta ?? input.priceDelta ?? 0)),
      placementBaseCost: round2(Number(input.placement?.baseCost ?? input.placementBaseCost ?? 0)),
      placementSurcharge: round2(Number(input.placement?.surcharge ?? input.placementSurcharge ?? 0)),
      gstRate: Number(input.product?.gstRate ?? input.gstRate ?? SETTINGS.defaultGstRate),
      quantity: input.quantity,
    },
    {
      coupon: input.coupon
        ? {
            type: input.coupon.type,
            value: Number(input.coupon.value),
            minOrderAmount: Number(input.coupon.minOrderAmount),
            maxDiscountAmount: input.coupon.maxDiscountAmount === null ? null : Number(input.coupon.maxDiscountAmount),
          }
        : null,
      couponCode: input.couponCode ?? null,
      shipping: input.shipping
        ? {
            baseFee: Number(input.shipping.baseFee),
            perItemFee: Number(input.shipping.perItemFee),
            freeAbove: input.shipping.freeAbove === null ? null : Number(input.shipping.freeAbove),
            method: input.shipping.method as "STANDARD" | "EXPRESS" | "PICKUP",
          }
        : null,
      tiers: input.tiers ?? QUANTITY_TIERS,
    },
  );
}
