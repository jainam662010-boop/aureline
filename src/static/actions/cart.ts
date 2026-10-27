/**
 * Static-build replacement for src/actions/cart.ts (GitHub Pages demo).
 *
 * Swapped in via the webpack alias in next.config.mjs when STATIC_EXPORT=1.
 * The cart runs entirely in localStorage — same response envelopes as the
 * production server actions, so the existing client components work unmodified.
 * Guest checkout/auth has no backend in a static export, but browsing,
 * designing and carting demonstrably work end-to-end.
 */
import { PRODUCTS, PLACEMENTS, COUPONS, QUANTITY_TIERS, SETTINGS } from "@/lib/static-catalog";
import { computePricing, sumBreakdowns, couponDiscountFor, validateCoupon } from "@/lib/pricing";
import { designPrintArea } from "@/lib/print-area";
import { blankUnitPrice } from "@/lib/price-list";
import type { DesignDocument } from "@/lib/editor-types";
import { STATIC_SHIPPING } from "@/lib/static-shipping";

/* ---------------------------------------------------------------- types -- */

export type PrintSideAlias = "FRONT" | "BACK";

export interface SerializedCartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  size: string;
  colorName: string;
  colorHex: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  placementKey: string;
  placementLabel: string;
  side: PrintSideAlias;
  designId: string | null;
  thumbnailUrl: string | null;
  hasDesign: boolean;
  garmentType: string;
  priceBreakdown: { label: string; amount: number; hint?: string }[];
}

export interface SerializedCart {
  id: string;
  items: SerializedCartItem[];
  couponCode: string | null;
  shippingMethod: "STANDARD" | "EXPRESS" | "PICKUP";
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number };
}

import type { ApiResponse } from "@/lib/response";

interface StoredItem {
  id: string;
  productId: string;
  variantId: string;
  shippingMethod: "STANDARD" | "EXPRESS" | "PICKUP";
  placementKey: string;
  side: PrintSideAlias;
  quantity: number;
  designId: string | null;
  /** Sanitised design (image data URLs stripped) used for area pricing. */
  designJson?: unknown;
  thumbnailUrl: string | null;
}

interface StoredCart {
  items: StoredItem[];
  couponCode: string | null;
  shippingMethod: "STANDARD" | "EXPRESS" | "PICKUP";
}

/* --------------------------------------------------------------- storage -- */

const STORAGE_KEY = "aur-static-cart";
const CART_ID = "static-cart";

const emptyCart = (): StoredCart => ({ items: [], couponCode: null, shippingMethod: "STANDARD" });

function readStored(): StoredCart {
  if (typeof window === "undefined") return emptyCart();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart();
    const parsed = JSON.parse(raw) as Partial<StoredCart>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      couponCode: parsed.couponCode ?? null,
      shippingMethod: parsed.shippingMethod ?? "STANDARD",
    };
  } catch {
    return emptyCart();
  }
}

function writeStored(cart: StoredCart) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(
      new CustomEvent("aureline:static-cart", { detail: { count: cart.items.reduce((s, i) => s + i.quantity, 0) } }),
    );
  } catch {
    /* storage full or private mode — cart stays in memory for this tab */
  }
}

/* -------------------------------------------------------------- pricing -- */

function placementFor(key: string) {
  return PLACEMENTS.find((p) => p.key === key) ?? null;
}

/**
 * Image sources can be data URLs in the static demo; strip them before writing
 * the design to localStorage. Pricing only needs geometry (x/y/w/h/angle).
 */
function compactDesign(doc: unknown): unknown {
  if (!doc || typeof doc !== "object") return null;
  const sides = ["FRONT", "BACK", "SLEEVE"] as const;
  const out: Record<string, { layers: Record<string, unknown>[] }> = {};
  for (const side of sides) {
    const layers = (doc as Record<string, { layers?: Record<string, unknown>[] } | undefined>)[side]?.layers;
    out[side] = {
      layers: Array.isArray(layers)
        ? layers.map(({ src: _src, ...rest }) => rest)
        : [],
    };
  }
  return out;
}

type CouponShape = { code: string; type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"; value: number; minOrderAmount: number; maxDiscountAmount: number | null };

function activeCoupon(): (CouponShape & { code: string }) | null {
  const code = readStored().couponCode;
  if (!code) return null;
  return COUPONS.find((c) => c.code === code) ?? null;
}

function buildItem(stored: StoredItem) {
  const product = PRODUCTS.find((p) => p.id === stored.productId);
  const variant = product?.variants.find((v) => v.id === stored.variantId);
  const placement = placementFor(stored.placementKey);
  if (!product || !variant || !placement) return null;

  const coupon = activeCoupon();
  const printArea = stored.designJson
    ? designPrintArea(stored.designJson as DesignDocument, stored.side, placement)
    : { areaSqIn: placement.widthIn * placement.heightIn };
  const breakdown = computePricing(
    {
      basePrice: product.basePrice,
      blankPriceForQty: blankUnitPrice(product.slug, stored.quantity, product.basePrice),
      priceDelta: variant.priceDelta,
      placementBaseCost: placement.baseCost,
      placementSurcharge: placement.surcharge,
      printAreaSqIn: printArea?.areaSqIn ?? null,
      gstRate: product.gstRate,
      quantity: stored.quantity,
    },
    {
      coupon: coupon ? { type: coupon.type, value: coupon.value, minOrderAmount: coupon.minOrderAmount, maxDiscountAmount: coupon.maxDiscountAmount } : null,
      couponCode: coupon?.code ?? null,
      shipping: STATIC_SHIPPING(stored.shippingMethod ?? "STANDARD"),
      tiers: QUANTITY_TIERS,
      printPricing: { ratePerSqIn: SETTINGS.printRatePerSqIn, minimum: SETTINGS.printMinimum },
    },
  );

  const item: SerializedCartItem = {
    id: stored.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    categorySlug: product.category.slug,
    size: variant.size,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    quantity: stored.quantity,
    unitPrice: breakdown.unitPrice,
    lineTotal: breakdown.subtotal,
    placementKey: placement.key,
    placementLabel: placement.label,
    side: stored.side,
    designId: stored.designId,
    thumbnailUrl: stored.thumbnailUrl,
    hasDesign: Boolean(stored.designJson),
    garmentType: product.category.slug,
    priceBreakdown: breakdown.lines.map((l) => ({ label: l.label, amount: l.amount, hint: l.hint })),
  };
  return { item, breakdown };
}

function payload(): SerializedCart {
  const stored = readStored();
  const built = stored.items.map(buildItem).filter((x): x is NonNullable<ReturnType<typeof buildItem>> => x !== null);
  return {
    id: CART_ID,
    items: built.map((b) => b.item),
    couponCode: stored.couponCode,
    shippingMethod: stored.shippingMethod,
    totals: sumBreakdowns(built.map((b) => b.breakdown)),
  };
}

/* -------------------------------------------------------------- actions -- */

export async function getCartCount(): Promise<number> {
  return readStored().items.reduce((sum, i) => sum + i.quantity, 0);
}

export async function recomputeCart(_cartId: string): Promise<null> {
  return null;
}

export async function getCartPayload(): Promise<ApiResponse<SerializedCart | null>> {
  return { ok: true, data: payload() };
}

export async function addToCart(input: {
  productId: string;
  variantId: string;
  placementKey: string;
  side: "FRONT" | "BACK";
  quantity: number;
  designId?: string | null;
  designJson?: unknown;
  thumbnailUrl?: string | null;
}): Promise<ApiResponse<{ itemId: string; count: number }>> {
  const product = PRODUCTS.find((p) => p.id === input.productId);
  if (!product) return { ok: false, error: "That blank is no longer in the static catalog." };
  if (!product.variants.some((v) => v.id === input.variantId)) {
    return { ok: false, error: "Pick a size and colour first." };
  }
  if (!placementFor(input.placementKey)) {
    return { ok: false, error: "Unknown print placement." };
  }

  const stored = readStored();
  // Keep thumbnails small so we never blow the localStorage quota.
  const thumbnail = input.thumbnailUrl && input.thumbnailUrl.length < 400_000 ? input.thumbnailUrl : null;
  const item: StoredItem = {
    id: `si-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    productId: input.productId,
    variantId: input.variantId,
    shippingMethod: stored.shippingMethod,
    placementKey: input.placementKey,
    side: input.side,
    quantity: Math.max(1, Math.floor(input.quantity)),
    designId: null,
    designJson: compactDesign(input.designJson),
    thumbnailUrl: thumbnail,
  };
  stored.items.push(item);
  writeStored(stored);
  return { ok: true, data: { itemId: item.id, count: stored.items.reduce((s, i) => s + i.quantity, 0) } };
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<ApiResponse<{ count: number }>> {
  const stored = readStored();
  const item = stored.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item not found in this cart." };
  item.quantity = Math.max(1, Math.floor(quantity));
  writeStored(stored);
  return { ok: true, data: { count: stored.items.reduce((s, i) => s + i.quantity, 0) } };
}

export async function removeCartItem(itemId: string): Promise<ApiResponse<{ count: number }>> {
  const stored = readStored();
  stored.items = stored.items.filter((i) => i.id !== itemId);
  writeStored(stored);
  return { ok: true, data: { count: stored.items.reduce((s, i) => s + i.quantity, 0) } };
}

export async function applyCoupon(code: string): Promise<ApiResponse<{ code: string; discount: number }>> {
  const coupon: CouponShape | undefined = COUPONS.find((c) => c.code === code.toUpperCase().trim());
  if (!coupon) return { ok: false, error: "This coupon does not exist in the demo catalog." };
  const stored = readStored();
  const goodsValue = stored.items.reduce((sum, s) => {
    const built = buildItem(s);
    return sum + (built ? built.breakdown.gross : 0);
  }, 0);
  const validity = validateCoupon(
    { isActive: true, deletedAt: null, startsAt: null, endsAt: null, minOrderAmount: coupon.minOrderAmount },
    goodsValue,
  );
  if (!validity.valid) return { ok: false, error: validity.error ?? "Coupon not applicable." };
  stored.couponCode = coupon.code ?? code.toUpperCase().trim();
  writeStored(stored);
  return {
    ok: true,
    data: { code: stored.couponCode!, discount: couponDiscountFor(coupon, goodsValue) },
  };
}

export async function removeCoupon(): Promise<ApiResponse<{ cleared: boolean }>> {
  const stored = readStored();
  stored.couponCode = null;
  writeStored(stored);
  return { ok: true, data: { cleared: true } };
}

export async function setShippingMethod(
  method: "STANDARD" | "EXPRESS" | "PICKUP",
): Promise<ApiResponse<{ method: "STANDARD" | "EXPRESS" | "PICKUP" }>> {
  const stored = readStored();
  stored.shippingMethod = method;
  writeStored(stored);
  return { ok: true, data: { method } };
}

export async function clearCart(): Promise<ApiResponse<{ cleared: boolean }>> {
  writeStored(emptyCart());
  return { ok: true, data: { cleared: true } };
}
