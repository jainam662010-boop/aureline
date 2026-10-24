"use server";

import { z } from "zod";
import type { Prisma, PrintSide, ShippingMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { findCart, getOrCreateCart, cartItemCount } from "@/lib/cart";
import { findCoupon, getPlacementsForProduct, getQuantityTiers, priceItem, resolveShipping } from "@/lib/commerce";
import { validateCoupon } from "@/lib/pricing";
import { num } from "@/lib/utils";
import { auth } from "@/lib/auth";

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  placementKey: z.string().min(1),
  side: z.enum(["FRONT", "BACK"]).default("FRONT"),
  quantity: z.number().int().min(1).max(500).default(1),
  designId: z.string().optional().nullable(),
  designJson: z.any().optional().nullable(),
  thumbnailUrl: z.string().max(2_000_000).optional().nullable(),
});

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
  side: PrintSide;
  designId: string | null;
  thumbnailUrl: string | null;
  garmentType: string;
  priceBreakdown: { label: string; amount: number }[];
}

export interface SerializedCart {
  id: string;
  items: SerializedCartItem[];
  couponCode: string | null;
  shippingMethod: ShippingMethod;
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number };
}

function serializeCart(
  cart: Awaited<ReturnType<typeof findCart>>,
  breakdowns: Record<string, { label: string; amount: number }[]>,
): SerializedCart | null {
  if (!cart) return null;
  const items: SerializedCartItem[] = cart.items.map((item) => {
    const bd = breakdowns[item.id];
    const unitPrice = num(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      productName: item.product.name,
      categorySlug: item.product.category.slug,
      size: item.variant.size,
      colorName: item.variant.colorName,
      colorHex: item.variant.colorHex,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      placementKey: item.placementKey,
      placementLabel: item.placementKey.replace(/_/g, " "),
      side: item.side,
      designId: item.designId,
      thumbnailUrl: item.thumbnailUrl,
      garmentType: item.product.category.slug,
      priceBreakdown: bd ?? [],
    };
  });

  const totals = items.reduce(
    (acc, i) => {
      acc.subtotal += i.lineTotal;
      return acc;
    },
    { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 },
  );

  return {
    id: cart.id,
    items,
    couponCode: cart.couponCode,
    shippingMethod: cart.shippingMethod,
    totals,
  };
}

/** Recomputes every cart line from the database pricing rules. */
export async function recomputeCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: { include: { product: { include: { category: true } }, variant: true } },
    },
  });
  if (!cart) return null;

  const tiers = await getQuantityTiers();
  const coupon = await findCoupon(cart.couponCode);
  const shipping = await resolveShipping(cart.shippingMethod, null);

  const breakdowns: Record<string, { label: string; amount: number }[]> = {};
  const couponLineIds: string[] = [];

  for (const item of cart.items) {
    const placements = await getPlacementsForProduct(item.product);
    const placement = placements.find((p) => p.key === item.placementKey) ?? placements[0] ?? null;
    const breakdown = await priceItem({
      product: item.product,
      variant: item.variant,
      placement,
      quantity: item.quantity,
      coupon,
      couponCode: cart.couponCode,
      shipping,
      tiers,
    });
    breakdowns[item.id] = breakdown.lines;
    couponLineIds.push(item.id);

    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        unitPrice: breakdown.unitPrice,
        placementKey: placement?.key ?? item.placementKey,
        priceBreakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Coupon discount is applied on the first line for visibility; cart-level totals
  // are recomputed by the caller with sumBreakdowns.
  return { cart, breakdowns, coupon, shipping, tiers };
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export async function getCartCount(): Promise<number> {
  try {
    const cart = await findCart();
    return cartItemCount(cart);
  } catch {
    return 0;
  }
}

export async function getCartPayload(): Promise<ApiResponse<SerializedCart | null>> {
  try {
    const cart = await findCart();
    if (!cart) return ok(null);

    const tiers = await getQuantityTiers();
    const coupon = await findCoupon(cart.couponCode);
    const shipping = await resolveShipping(cart.shippingMethod, null);

    const breakdowns: Record<string, { label: string; amount: number }[]> = {};
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let shippingTotal = 0;

    for (const item of cart.items) {
      const placements = await getPlacementsForProduct(item.product);
      const placement = placements.find((p) => p.key === item.placementKey) ?? placements[0] ?? null;
      const breakdown = await priceItem({
        product: item.product,
        variant: item.variant,
        placement,
        quantity: item.quantity,
        coupon,
        couponCode: cart.couponCode,
        shipping,
        tiers,
      });
      breakdowns[item.id] = breakdown.lines;
      subtotal += breakdown.subtotal;
      discount += breakdown.quantityDiscount;
      tax += breakdown.tax;
      shippingTotal += breakdown.shipping;
    }

    if (coupon && subtotal > 0) {
      const check = validateCoupon(coupon, subtotal);
      if (check.valid) {
        const { couponDiscountFor } = await import("@/lib/pricing");
        const c = couponDiscountFor(
          {
            type: coupon.type,
            value: num(coupon.value),
            minOrderAmount: num(coupon.minOrderAmount),
            maxDiscountAmount: coupon.maxDiscountAmount !== null ? num(coupon.maxDiscountAmount) : null,
          },
          subtotal,
        );
        discount += c;
        subtotal -= c;
      }
    }

    const serialized = serializeCart(cart, breakdowns);
    if (serialized) {
      serialized.totals = {
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        shipping: Math.round(shippingTotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round((subtotal + shippingTotal + tax) * 100) / 100,
      };
    }

    return ok(serialized);
  } catch (error) {
    console.error("[cart] getCartPayload", error);
    return fail("Could not load your cart.");
  }
}

export async function addToCart(input: z.infer<typeof addToCartSchema>): Promise<ApiResponse<{ itemId: string; count: number }>> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid cart input.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);

  try {
    const { productId, variantId, placementKey, side, quantity, designId, designJson, thumbnailUrl } = parsed.data;

    const [product, variant, placement] = await Promise.all([
      prisma.product.findFirst({ where: { id: productId, deletedAt: null, status: "ACTIVE" }, include: { category: true } }),
      prisma.productVariant.findFirst({ where: { id: variantId, isActive: true } }),
      prisma.printPlacement.findFirst({ where: { key: placementKey, isActive: true } }),
    ]);

    if (!product) return fail("That product is unavailable.", "NOT_FOUND");
    if (!variant || variant.productId !== product.id) return fail("Choose a valid size and colour first.", "VARIANT");
    if (variant.stock < quantity) return fail(`Only ${variant.stock} left in ${variant.size} / ${variant.colorName}.`, "STOCK");
    if (!placement) return fail("Choose a print placement.", "PLACEMENT");

    const tiers = await getQuantityTiers();
    const cart = await getOrCreateCart();
    const shipping = await resolveShipping(cart.shippingMethod, null);
    const breakdown = await priceItem({ product, variant, placement, quantity, shipping, tiers });

    const item = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant.id,
        designId: designId ?? null,
        side: side as PrintSide,
        placementKey: placement.key,
        quantity,
        designJson: (designJson as Prisma.InputJsonValue) ?? undefined,
        thumbnailUrl: thumbnailUrl ?? null,
        unitPrice: breakdown.unitPrice,
        priceBreakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

    const count = cartItemCount((await findCart()) ?? cart);
    return ok({ itemId: item.id, count });
  } catch (error) {
    console.error("[cart] addToCart", error);
    return fail("Could not add to cart. Please try again.");
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<ApiResponse<{ count: number }>> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return fail("Invalid quantity.", "VALIDATION");
  try {
    const cart = await findCart();
    const item = cart?.items.find((i) => i.id === itemId);
    if (!cart || !item) return fail("Cart item not found.", "NOT_FOUND");

    if (item.variant.stock < quantity) {
      return fail(`Only ${item.variant.stock} available for ${item.variant.size} / ${item.variant.colorName}.`, "STOCK");
    }

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    await recomputeCart(cart.id);
    const updated = await findCart();
    return ok({ count: cartItemCount(updated) });
  } catch (error) {
    console.error("[cart] updateCartItemQuantity", error);
    return fail("Could not update quantity.");
  }
}

export async function removeCartItem(itemId: string): Promise<ApiResponse<{ count: number }>> {
  try {
    const cart = await findCart();
    if (!cart?.items.some((i) => i.id === itemId)) return fail("Cart item not found.", "NOT_FOUND");
    await prisma.cartItem.delete({ where: { id: itemId } });
    await recomputeCart(cart.id);
    const updated = await findCart();
    return ok({ count: cartItemCount(updated) });
  } catch (error) {
    console.error("[cart] removeCartItem", error);
    return fail("Could not remove item.");
  }
}

export async function applyCoupon(code: string): Promise<ApiResponse<{ code: string; discount: number }>> {
  const trimmed = code?.toUpperCase().trim();
  if (!trimmed) return fail("Enter a coupon code.", "VALIDATION");

  try {
    const cart = await findCart();
    if (!cart || cart.items.length === 0) return fail("Your cart is empty.", "EMPTY");

    const coupon = await findCoupon(trimmed);
    if (!coupon) return fail("This coupon does not exist.", "NOT_FOUND");

    const subtotal = cart.items.reduce((sum, i) => sum + num(i.unitPrice) * i.quantity, 0);
    const check = validateCoupon(coupon, subtotal);
    if (!check.valid) return fail(check.error ?? "Invalid coupon.", "INVALID_COUPON");

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return fail("This coupon has reached its usage limit.", "USAGE_LIMIT");
    }

    if (coupon.perUserLimit) {
      const session = await auth();
      if (session?.user?.id) {
        const used = await prisma.order.count({
          where: { userId: session.user.id, couponCode: coupon.code, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
        });
        if (used >= coupon.perUserLimit) return fail("You've already used this coupon.", "PER_USER_LIMIT");
      }
    }

    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } });
    await recomputeCart(cart.id);
    return ok({ code: coupon.code, discount: 0 });
  } catch (error) {
    console.error("[cart] applyCoupon", error);
    return fail("Could not apply coupon.");
  }
}

export async function removeCoupon(): Promise<ApiResponse<{ cleared: boolean }>> {
  try {
    const cart = await findCart();
    if (!cart) return ok({ cleared: false });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null, couponDiscount: 0 } });
    return ok({ cleared: true });
  } catch {
    return fail("Could not remove coupon.");
  }
}

export async function setShippingMethod(method: ShippingMethod): Promise<ApiResponse<{ method: ShippingMethod }>> {
  if (method !== "STANDARD" && method !== "EXPRESS") return fail("Invalid shipping method.", "VALIDATION");
  try {
    const cart = await getOrCreateCart();
    await prisma.cart.update({ where: { id: cart.id }, data: { shippingMethod: method } });
    return ok({ method });
  } catch {
    return fail("Could not update shipping method.");
  }
}

export async function clearCart(): Promise<ApiResponse<{ cleared: boolean }>> {
  try {
    const cart = await findCart();
    if (!cart) return ok({ cleared: false });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null, couponDiscount: 0 } });
    return ok({ cleared: true });
  } catch {
    return fail("Could not clear cart.");
  }
}
