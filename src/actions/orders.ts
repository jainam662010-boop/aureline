"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { findCart } from "@/lib/cart";
import { findCoupon, getPlacementsForProduct, getQuantityTiers, getSettings, priceItem, resolveShipping } from "@/lib/commerce";
import { validateCoupon, type PriceBreakdown } from "@/lib/pricing";
import { createRazorpayOrder, razorpayEnabled, verifyPaymentSignature } from "@/lib/razorpay";
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from "@/lib/mail";
import { PICKUP_STORE, pickupAddressLine, pickupUnit } from "@/lib/store";
import { generateOrderNumber, num, absoluteUrl, formatINR } from "@/lib/utils";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  whatsappPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter the WhatsApp number we should update you on.")
    .optional()
    .or(z.literal("")),
  fullName: z.string().min(2, "Enter your full name.").max(80),
  line1: z.string().max(160).optional().or(z.literal("")),
  line2: z.string().max(160).optional().nullable(),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(60).optional().or(z.literal("")),
  pincode: z.string().max(6).optional().or(z.literal("")),
  shippingMethod: z.enum(["STANDARD", "EXPRESS", "PICKUP"]).default("STANDARD"),
  saveAddress: z.boolean().default(false),
}).superRefine((values, ctx) => {
  // Pickup (take away) orders need no delivery address; shipped orders do.
  if (values.shippingMethod === "PICKUP") return;
  const checks: [keyof typeof values, string][] = [
    ["line1", "Enter your address."],
    ["city", "Enter your city."],
    ["state", "Enter your state."],
    ["pincode", "Enter a valid 6-digit PIN code."],
  ];
  for (const [key, message] of checks) {
    const value = String(values[key] ?? "").trim();
    const ok = key === "pincode" ? /^\d{6}$/.test(value) : value.length >= (key === "line1" ? 4 : 2);
    if (!ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
    }
  }
});

export interface SerializedOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  createdAt: string;
  itemCount: number;
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                    */
/* -------------------------------------------------------------------------- */

export async function startCheckout(input: z.infer<typeof checkoutSchema>): Promise<
  ApiResponse<{
    orderId: string;
    razorpayOrderId: string | null;
    razorpayKeyId: string | null;
    amountRupees: number;
    amountPaise: number;
    demoMode: boolean;
  }>
> {
  const session = await auth();
  const ip = clientIp(await headers());
  const limited = rateLimit(`checkout:${session?.user?.id ?? ip}`, RATE_LIMITS.checkout.limit, RATE_LIMITS.checkout.windowMs);
  if (!limited.ok) return fail("Too many checkout attempts. Please wait a moment.", "RATE_LIMIT");

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const cart = await findCart();
    if (!cart || cart.items.length === 0) return fail("Your cart is empty.", "EMPTY");

    const tiers = await getQuantityTiers();
    const coupon = await findCoupon(cart.couponCode);
    const settings = await getSettings();
    if (coupon) {
      const subtotal = cart.items.reduce((s, i) => s + num(i.unitPrice) * i.quantity, 0);
      const check = validateCoupon(coupon, subtotal);
      if (!check.valid) return fail(check.error ?? "Invalid coupon.", "INVALID_COUPON");
    }

    // Pickup (take away) orders skip courier pricing entirely.
    const isPickup = parsed.data.shippingMethod === "PICKUP";
    const shipping: Awaited<ReturnType<typeof resolveShipping>> = isPickup
      ? { baseFee: 0, perItemFee: 0, freeAbove: null, method: "STANDARD", etaDays: 0, zoneName: PICKUP_STORE.mall }
      : await resolveShipping(parsed.data.shippingMethod, parsed.data.pincode);

    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let shippingTotal = 0;
    const lineData: {
      item: (typeof cart.items)[number];
      placement: { key: string; label: string } | null;
      breakdown: PriceBreakdown;
    }[] = [];

    for (const item of cart.items) {
      const placements = await getPlacementsForProduct(item.product);
      const placement = placements.find((p) => p.key === item.placementKey) ?? placements[0] ?? null;
      const breakdown = await priceItem({
        product: item.product,
        variant: item.variant,
        placement,
        designJson: item.designJson,
        side: item.side,
        settings,
        quantity: item.quantity,
        coupon,
        couponCode: cart.couponCode,
        shipping,
        tiers,
      });
      lineData.push({ item, placement, breakdown });
      subtotal += breakdown.subtotal;
      discount += breakdown.quantityDiscount;
      tax += breakdown.tax;
      shippingTotal += breakdown.shipping;
    }

    if (coupon) {
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

    const total = Math.round((subtotal + shippingTotal + tax) * 100) / 100;
    if (total <= 0) return fail("Invalid order total.", "PRICING");

    // Stock guard
    for (const line of lineData) {
      if (line.item.variant.stock < line.item.quantity) {
        return fail(`${line.item.product.name} (${line.item.variant.size}) has only ${line.item.variant.stock} left.`, "STOCK");
      }
    }

    const orderNumber = generateOrderNumber();
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session?.user?.id ?? null,
        status: "PENDING_PAYMENT",
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        whatsappPhone: parsed.data.whatsappPhone || parsed.data.phone,
        shippingFullName: parsed.data.fullName,
        shippingLine1: isPickup ? pickupAddressLine() : (parsed.data.line1 ?? ""),
        shippingLine2: isPickup ? PICKUP_STORE.mall : (parsed.data.line2 || null),
        shippingCity: isPickup ? PICKUP_STORE.city : (parsed.data.city ?? ""),
        shippingState: isPickup ? PICKUP_STORE.state : (parsed.data.state ?? ""),
        shippingPincode: isPickup ? PICKUP_STORE.pincode : (parsed.data.pincode ?? ""),
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: Math.round(discount * 100) / 100,
        shippingAmount: Math.round(shippingTotal * 100) / 100,
        taxAmount: Math.round(tax * 100) / 100,
        total,
        couponCode: cart.couponCode,
        shippingMethod: parsed.data.shippingMethod,
        // Pickup orders are usually ready in 1–2 working days; courier orders
        // use the zone ETA returned by resolveShipping.
        etaDate: new Date(Date.now() + (isPickup ? 2 : shipping.etaDays) * 24 * 60 * 60 * 1000),
        items: {
          create: lineData.map((line) => ({
            productId: line.item.productId,
            productName: line.item.product.name,
            variantSize: line.item.variant.size,
            variantColor: line.item.variant.colorName,
            colorHex: line.item.variant.colorHex,
            placementKey: line.placement?.key ?? line.item.placementKey,
            side: line.item.side,
            designId: line.item.designId,
            designJson: (line.item.designJson as Prisma.InputJsonValue) ?? undefined,
            thumbnailUrl: line.item.thumbnailUrl,
            quantity: line.item.quantity,
            unitPrice: line.breakdown.unitPrice,
            lineTotal: Math.round(line.breakdown.unitPrice * line.item.quantity * 100) / 100,
            priceBreakdown: line.breakdown as unknown as Prisma.InputJsonValue,
          })),
        },
        notes: {
          create: {
            body: `Checkout initiated${session?.user?.id ? " by signed-in customer" : " by guest"}.`,
            isInternal: true,
            authorId: session?.user?.id ?? null,
          },
        },
      },
    });

    // Save address book entry for signed-in customers. Pickup orders carry the
    // store's address, so there is nothing customer-owned to remember.
    if (session?.user?.id && parsed.data.saveAddress && !isPickup) {
      await prisma.address.create({
        data: {
          userId: session.user.id,
          label: "Home",
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          line1: parsed.data.line1 ?? "",
          line2: parsed.data.line2 ?? null,
          city: parsed.data.city ?? "",
          state: parsed.data.state ?? "",
          pincode: parsed.data.pincode ?? "",
        },
      });
    }

    if (!razorpayEnabled()) {
      // Demo mode: no gateway keys configured. Order is created; payment must be
      // confirmed from the admin dashboard (documented in README).
      void notifyRequestReceived(order.id, order.orderNumber, order.whatsappPhone, total);
      return ok({
        orderId: order.id,
        razorpayOrderId: null,
        razorpayKeyId: null,
        amountRupees: total,
        amountPaise: Math.round(total * 100),
        demoMode: true,
      });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: total,
      receipt: orderNumber,
      notes: { orderId: order.id, orderNumber },
    });

    void notifyRequestReceived(order.id, orderNumber, order.whatsappPhone, total);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: session?.user?.id ?? null,
        razorpayOrderId: rzpOrder.id,
        amount: total,
        currency: "INR",
        status: "PENDING",
      },
    });

    return ok({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null,
      amountRupees: total,
      amountPaise: rzpOrder.amount,
      demoMode: false,
    });
  } catch (error) {
    console.error("[orders] startCheckout", error);
    return fail("Could not start checkout. Please try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* Payment verification                                                        */
/* -------------------------------------------------------------------------- */

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function verifyPayment(input: z.infer<typeof verifySchema>): Promise<ApiResponse<{ orderNumber: string; orderId: string }>> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return fail("Missing payment details.", "VALIDATION");

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  try {
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
    if (!payment) return fail("Payment record not found.", "NOT_FOUND");
    if (payment.status === "CAPTURED") {
      const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
      return ok({ orderNumber: order?.orderNumber ?? "", orderId: payment.orderId });
    }

    const valid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!valid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Signature verification failed", raw: { ...parsed.data } as Prisma.InputJsonValue },
      });
      return fail("Payment signature verification failed.", "SIGNATURE");
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          raw: { ...parsed.data } as Prisma.InputJsonValue,
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "PAYMENT_CONFIRMED" },
      }),
    ]);

    await finalizeOrder(payment.orderId);
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    return ok({ orderNumber: order?.orderNumber ?? "", orderId: payment.orderId });
  } catch (error) {
    console.error("[orders] verifyPayment", error);
    return fail("Could not verify payment.");
  }
}

export async function recordPaymentFailure(input: {
  razorpay_order_id: string;
  code?: string;
  description?: string;
}): Promise<ApiResponse<{ recorded: boolean }>> {
  try {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: input.razorpay_order_id, status: "PENDING" },
      data: {
        status: "FAILED",
        failureReason: `${input.code ?? ""} ${input.description ?? ""}`.trim() || "Customer cancelled",
        raw: input as unknown as Prisma.InputJsonValue,
      },
    });
    return ok({ recorded: true });
  } catch {
    return ok({ recorded: false });
  }
}

/** Post-payment side effects: stock, coupon usage, email. */
async function finalizeOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { design: true } } },
  });
  if (!order) return;

  try {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.productVariant.updateMany({
          where: { stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    );
  } catch (error) {
    console.error("[orders] stock decrement failed", error);
  }

  if (order.couponCode) {
    await prisma.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
  }

  const { delivered } = await sendEmail(
    orderConfirmationEmail({
      to: order.email,
      orderNumber: order.orderNumber,
      total: formatINR(num(order.total), true),
      items: order.items.map((i) => ({ name: `${i.productName} (${i.variantSize})`, qty: i.quantity })),
      trackingUrl: absoluteUrl(`/orders/${order.id}`),
    }),
  );
  if (delivered) {
    await prisma.orderNote.create({
      data: { orderId: order.id, body: "Confirmation email sent to customer.", isInternal: true },
    });
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
}

/* -------------------------------------------------------------------------- */
/* Reads & tracking                                                            */
/* -------------------------------------------------------------------------- */

export interface SerializedOrderItem {
  id: string;
  productName: string;
  variantSize: string;
  variantColor: string;
  colorHex: string;
  placementKey: string;
  side: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  thumbnailUrl: string | null;
  designId: string | null;
  productId: string | null;
}

export interface SerializedOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  email: string;
  phone: string | null;
  shippingFullName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  couponCode: string | null;
  shippingMethod: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  etaDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: SerializedOrderItem[];
  paymentStatus: string | null;
}

function serializeOrder(order: Prisma.OrderGetPayload<{ include: { items: true; payments: true } }>): SerializedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    email: order.email,
    phone: order.phone,
    shippingFullName: order.shippingFullName,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingPincode: order.shippingPincode,
    subtotal: num(order.subtotal),
    discountAmount: num(order.discountAmount),
    shippingAmount: num(order.shippingAmount),
    taxAmount: num(order.taxAmount),
    total: num(order.total),
    couponCode: order.couponCode,
    shippingMethod: order.shippingMethod,
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    etaDate: order.etaDate?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    paymentStatus: order.payments[0]?.status ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      variantSize: i.variantSize,
      variantColor: i.variantColor,
      colorHex: i.colorHex,
      placementKey: i.placementKey,
      side: i.side,
      quantity: i.quantity,
      unitPrice: num(i.unitPrice),
      lineTotal: num(i.lineTotal),
      thumbnailUrl: i.thumbnailUrl,
      designId: i.designId,
      productId: i.productId,
    })),
  };
}

export async function listMyOrders(): Promise<ApiResponse<SerializedOrder[]>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in to view orders.", "UNAUTHENTICATED");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok(orders.map(serializeOrder));
}

export async function getOrder(orderId: string): Promise<ApiResponse<SerializedOrder | null>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in to view this order.", "UNAUTHENTICATED");

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id, deletedAt: null },
    include: { items: true, payments: true },
  });
  if (!order) return fail("Order not found.", "NOT_FOUND");
  return ok(serializeOrder(order));
}

const trackSchema = z.object({
  identifier: z.string().min(3, "Enter an order ID or email."),
});

export async function trackOrder(input: z.infer<typeof trackSchema>): Promise<ApiResponse<SerializedOrder | null>> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return fail("Enter an order ID or email.", "VALIDATION");

  const id = parsed.data.identifier.trim();
  const session = await auth();

  try {
    const orFilters: Prisma.OrderWhereInput[] = [{ orderNumber: { equals: id } }, { id }];
    if (id.includes("@")) orFilters.push({ email: { equals: id.toLowerCase() } });

    const order = await prisma.order.findFirst({
      where: { OR: orFilters, deletedAt: null },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });

    if (!order) return fail("No order found with that ID or email.", "NOT_FOUND");

    // Privacy: only reveal the order to its owner, its email holder, or anyone
    // holding the exact order id/number (link sharing for guest orders).
    const ownsBySession = Boolean(session?.user?.id && order.userId === session.user.id);
    const isExactMatch = order.orderNumber.toLowerCase() === id.toLowerCase() || order.id === id;
    const isEmailMatch = id.includes("@") && order.email === id.toLowerCase();
    if (!ownsBySession && !isExactMatch && !isEmailMatch) {
      return fail("No order found with that ID or email.", "NOT_FOUND");
    }

    return ok(serializeOrder(order));
  } catch (error) {
    console.error("[orders] trackOrder", error);
    return fail("Could not track that order.");
  }
}

export async function reorder(orderId: string): Promise<ApiResponse<{ count: number }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in to reorder.", "UNAUTHENTICATED");

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id, deletedAt: null },
      include: { items: true },
    });
    if (!order) return fail("Order not found.", "NOT_FOUND");

    const cart = await prisma.cart.findFirst({
      where: { userId: session.user.id, deletedAt: null },
      include: { items: true },
    });

    const targetCart =
      cart ??
      (await prisma.cart.create({ data: { userId: session.user.id }, include: { items: true } }));

    let added = 0;
    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null, status: "ACTIVE" },
      });
      if (!product) continue;
      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id, size: item.variantSize, colorName: item.variantColor, isActive: true },
      });
      if (!variant) continue;

      await prisma.cartItem.create({
        data: {
          cartId: targetCart.id,
          productId: product.id,
          variantId: variant.id,
          designId: item.designId,
          side: item.side as never,
          placementKey: item.placementKey,
          quantity: item.quantity,
          designJson: (item.designJson as Prisma.InputJsonValue) ?? undefined,
          thumbnailUrl: item.thumbnailUrl,
          unitPrice: item.unitPrice,
          priceBreakdown: (item.priceBreakdown as Prisma.InputJsonValue) ?? undefined,
        },
      });
      added += 1;
    }

    revalidatePath("/cart");
    return ok({ count: added });
  } catch (error) {
    console.error("[orders] reorder", error);
    return fail("Could not reorder these items.");
  }
}

/** Fire-and-forget: WhatsApp "request received" ping right after checkout. */
async function notifyRequestReceived(
  orderId: string,
  orderNumber: string,
  whatsappPhone: string | null,
  totalRupees: number,
): Promise<void> {
  try {
    const { sendWhatsapp, requestReceivedMessage } = await import("@/lib/whatsapp");
    const result = await sendWhatsapp({
      to: whatsappPhone,
      message: requestReceivedMessage({ orderNumber, total: formatINR(totalRupees) }),
    });
    if (result.fallbackUrl) {
      await prisma.orderNote.create({
        data: {
          orderId,
          authorId: null,
          body: `WhatsApp "request received" not auto-sent (no API keys). Send manually: ${result.fallbackUrl}`,
          isInternal: true,
        },
      });
    }
  } catch (error) {
    console.error("[orders] whatsapp received ping", error);
  }
}

/** Internal: used by the admin dashboard to notify customers on status change. */
export async function notifyOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<{ sent: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { sent: false };
  const { delivered } = await sendEmail(
    orderStatusEmail({
      to: order.email,
      orderNumber: order.orderNumber,
      status,
      note,
      trackingUrl: absoluteUrl(`/orders/${order.id}`),
    }),
  );

  // Mirror on WhatsApp. The template depends on the stage: "request accepted"
  // for the acceptance moment, a dispatch/pickup notice once it leaves us.
  try {
    const { sendWhatsapp, requestAcceptedMessage, shippedMessage, pickupReadyMessage } = await import("@/lib/whatsapp");
    const isPickup = order.shippingMethod === "PICKUP";
    let message: string;

    if (status === "SHIPPED" && !isPickup) {
      message = shippedMessage({
        orderNumber: order.orderNumber,
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      });
    } else if (status === "PACKED" && isPickup) {
      message = pickupReadyMessage({
        orderNumber: order.orderNumber,
        store: `${PICKUP_STORE.mall}, ${PICKUP_STORE.area}`,
        unit: pickupUnit(),
        note,
      });
    } else {
      message = requestAcceptedMessage({ orderNumber: order.orderNumber, note });
    }

    void sendWhatsapp({ to: order.whatsappPhone ?? order.phone, message });
  } catch (error) {
    console.error("[orders] whatsapp status ping", error);
  }

  return { sent: delivered };
}
