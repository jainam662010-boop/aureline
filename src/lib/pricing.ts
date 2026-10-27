import type { CouponType, Prisma } from "@prisma/client";
import { num } from "@/lib/utils";

/**
 * ============================================================================
 * Pricing engine
 * ============================================================================
 * final price =
 *   base product price
 * + print cost (placement base cost + placement surcharge)
 * + quantity-based discount (negative line)
 * - coupon discount
 * + shipping fee
 * + GST / tax
 *
 * All inputs come from the database (products, variants, print placements,
 * quantity discounts, coupons, shipping rates, settings) so admins can change
 * pricing from /admin/settings without a code deploy.
 * ============================================================================
 */

export interface PricingItemInput {
  basePrice: number;
  /**
   * Per-piece blank price already resolved from the quantity price sheet.
   * When provided it replaces basePrice and the percentage quantity tiers are
   * skipped (the ladder itself is the volume discount).
   */
  blankPriceForQty?: number | null;
  priceDelta: number;
  placementBaseCost: number;
  placementSurcharge: number;
  /** Actual artwork bounding-box area inside the placement, in square inches. */
  printAreaSqIn?: number | null;
  gstRate: number;
  quantity: number;
}

export interface PrintPricingInput {
  /** ₹ per square inch of printed artwork; 0 disables area pricing. */
  ratePerSqIn: number;
  /** Floor in ₹ for any single print. */
  minimum: number;
}

export interface CouponInput {
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  productIds?: string[];
  categoryIds?: string[];
}

export interface ShippingInput {
  baseFee: number;
  perItemFee: number;
  freeAbove: number | null;
  method: "STANDARD" | "EXPRESS" | "PICKUP";
}

export interface QuantityTier {
  minQty: number;
  maxQty: number | null;
  percentOff: number;
}

export interface PriceBreakdownLine {
  label: string;
  amount: number;
  hint?: string;
}

export interface PriceBreakdown {
  unitBase: number;
  unitPrint: number;
  unitPrice: number;
  quantity: number;
  gross: number;
  /** Printed area used for pricing (null = flat placement fee). */
  printAreaSqIn: number | null;
  printRatePerSqIn: number | null;
  printMinimum: number | null;
  quantityDiscountPercent: number;
  quantityDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  shipping: number;
  taxPercent: number;
  tax: number;
  total: number;
  lines: PriceBreakdownLine[];
}

export interface PricingContext {
  coupon?: CouponInput | null;
  couponCode?: string | null;
  shipping?: ShippingInput | null;
  tiers?: QuantityTier[];
  printPricing?: PrintPricingInput | null;
}

export function resolveQuantityTier(tiers: QuantityTier[], qty: number): QuantityTier | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const tier = sorted[i]!;
    if (qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty)) return tier;
  }
  return null;
}

export function couponDiscountFor(coupon: CouponInput, amount: number): number {
  if (amount < coupon.minOrderAmount) return 0;
  let discount = 0;
  if (coupon.type === "PERCENTAGE") {
    discount = (amount * coupon.value) / 100;
  } else if (coupon.type === "FIXED") {
    discount = coupon.value;
  }
  if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount > 0) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  return Math.max(0, Math.min(discount, amount));
}

/** Validates a coupon against a cart subtotal. Returns a user-facing error when invalid. */
export function validateCoupon(
  coupon: { isActive: boolean; deletedAt: Date | null; startsAt: Date | null; endsAt: Date | null; minOrderAmount: Prisma.Decimal | number | string } | null | undefined,
  subtotal: number,
): { valid: boolean; error?: string } {
  if (!coupon || coupon.deletedAt) return { valid: false, error: "This coupon does not exist." };
  if (!coupon.isActive) return { valid: false, error: "This coupon is no longer active." };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { valid: false, error: "This coupon isn't active yet." };
  if (coupon.endsAt && coupon.endsAt < now) return { valid: false, error: "This coupon has expired." };
  if (subtotal < num(coupon.minOrderAmount)) {
    return {
      valid: false,
      error: `This coupon needs a minimum order of ₹${num(coupon.minOrderAmount).toLocaleString("en-IN")}.`,
    };
  }
  return { valid: true };
}

/**
 * Computes the full price breakdown for a single order line (cart item).
 * All monetary math is done in rupees with 2-decimal rounding at the end.
 */
export function computePricing(item: PricingItemInput, ctx: PricingContext = {}): PriceBreakdown {
  const qty = Math.max(1, Math.floor(item.quantity));

  const usePriceLadder = item.blankPriceForQty != null && Number.isFinite(item.blankPriceForQty);
  const unitBase = round2((usePriceLadder ? item.blankPriceForQty! : item.basePrice) + item.priceDelta);
  const flatPrint = round2(item.placementBaseCost + item.placementSurcharge);

  // Area pricing: charge for the artwork's actual bounding box, with a floor.
  // No design attached (catalogue quick-add) → keep the placement's flat fee.
  const printPricing = ctx.printPricing;
  const areaSqIn =
    item.printAreaSqIn != null && Number.isFinite(item.printAreaSqIn) && item.printAreaSqIn > 0
      ? round2(item.printAreaSqIn)
      : null;
  const useAreaPricing = Boolean(printPricing && printPricing.ratePerSqIn > 0 && areaSqIn != null);
  const unitPrint = useAreaPricing
    ? round2(Math.max(printPricing!.minimum, areaSqIn! * printPricing!.ratePerSqIn))
    : flatPrint;

  const unitPrice = round2(unitBase + unitPrint);
  const gross = round2(unitPrice * qty);

  const tier = usePriceLadder ? null : resolveQuantityTier(ctx.tiers ?? [], qty);
  const quantityDiscountPercent = tier ? Number(tier.percentOff) : 0;
  const quantityDiscount = round2((gross * quantityDiscountPercent) / 100);
  const afterQty = round2(gross - quantityDiscount);

  // Coupon
  let couponDiscount = 0;
  let couponCode: string | null = null;
  if (ctx.coupon) {
    couponDiscount = round2(couponDiscountFor(ctx.coupon, afterQty));
    couponCode = ctx.couponCode ?? null;
  }
  const subtotal = round2(afterQty - couponDiscount);

  // Shipping
  let shipping = 0;
  const shippingInput = ctx.shipping;
  if (shippingInput) {
    if (ctx.coupon?.type === "FREE_SHIPPING" && couponDiscount === 0) {
      // FREE_SHIPPING coupons zero the shipping line below instead of discounting goods
      shipping = 0;
      couponCode = ctx.couponCode ?? null;
    } else {
      shipping = round2(shippingInput.baseFee + shippingInput.perItemFee * qty);
    }
    const freeAbove = shippingInput.freeAbove;
    if (shippingInput.method === "STANDARD" && freeAbove && subtotal >= freeAbove) shipping = 0;
    if (ctx.coupon?.type === "FREE_SHIPPING") shipping = 0;
  }

  // Tax — GST applies to the discounted goods value (shipping taxed separately by config, default off)
  const taxPercent = Math.max(0, item.gstRate ?? 0);
  const tax = round2((subtotal * taxPercent) / 100);

  const total = round2(subtotal + shipping + tax);

  const lines: PriceBreakdownLine[] = [
    {
      label: usePriceLadder ? "Blank garment" : "Base product",
      amount: round2(unitBase * qty),
      hint: `₹${unitBase.toFixed(0)} × ${qty}`,
    },
  ];
  if (unitPrint > 0) {
    lines.push({
      label: "Print cost",
      amount: round2(unitPrint * qty),
      hint: useAreaPricing
        ? `${areaSqIn!.toFixed(1)} in² × ₹${printPricing!.ratePerSqIn.toFixed(2)}/in²${printPricing!.minimum > 0 ? ` (min ₹${printPricing!.minimum})` : ""}`
        : `₹${unitPrint.toFixed(0)} × ${qty}`,
    });
  }
  if (quantityDiscountPercent > 0) {
    lines.push({
      label: `Volume discount (${quantityDiscountPercent}%)`,
      amount: -quantityDiscount,
      hint: qty > 1 ? `${qty} pcs` : undefined,
    });
  }
  if (couponDiscount > 0) {
    lines.push({ label: `Coupon ${couponCode ?? ""}`.trim(), amount: -couponDiscount });
  }
  lines.push({ label: "Subtotal", amount: subtotal });
  lines.push({
    label: shippingInput ? `Shipping (${shippingInput.method.toLowerCase()})` : "Shipping",
    amount: shipping,
    hint: shipping === 0 && shippingInput ? "Free" : undefined,
  });
  if (tax > 0) lines.push({ label: `GST (${taxPercent}%)`, amount: tax });
  lines.push({ label: "Total", amount: total });

  return {
    unitBase,
    unitPrint,
    unitPrice,
    quantity: qty,
    gross,
    printAreaSqIn: areaSqIn,
    printRatePerSqIn: useAreaPricing ? printPricing!.ratePerSqIn : null,
    printMinimum: useAreaPricing ? printPricing!.minimum : null,
    quantityDiscountPercent,
    quantityDiscount,
    couponCode,
    couponDiscount,
    subtotal,
    shipping,
    taxPercent,
    tax,
    total,
    lines,
  };
}

/** Convenience: total across many line breakdowns (cart summary). */
export function sumBreakdowns(breakdowns: PriceBreakdown[]) {
  return breakdowns.reduce(
    (acc, b) => ({
      subtotal: round2(acc.subtotal + b.subtotal),
      discount: round2(acc.discount + b.quantityDiscount + b.couponDiscount),
      shipping: round2(acc.shipping + b.shipping),
      tax: round2(acc.tax + b.tax),
      total: round2(acc.total + b.total),
    }),
    { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 },
  );
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
