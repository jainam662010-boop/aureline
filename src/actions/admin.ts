"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { OrderStatus, ProductStatus, BulkEnquiryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { sendEmail, orderStatusEmail } from "@/lib/mail";
import { invalidateSettingsCache } from "@/lib/commerce";
import { ORDER_FLOW } from "@/components/orders/order-status";
import { PICKUP_STORE, pickupUnit } from "@/lib/store";
import { num } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Schemas                                                                     */
/* -------------------------------------------------------------------------- */

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING_PAYMENT",
    "PAYMENT_CONFIRMED",
    "ARTWORK_REVIEW",
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUND_REQUESTED",
    "REFUNDED",
  ]),
  note: z.string().max(500).optional().or(z.literal("")),
});

const trackingSchema = z.object({
  orderId: z.string().min(1),
  courier: z.string().min(2).max(60),
  trackingNumber: z.string().min(3).max(60),
  trackingUrl: z.string().url().optional().or(z.literal("")),
});

const noteSchema = z.object({
  orderId: z.string().min(1),
  body: z.string().min(2, "Write a note.").max(1000),
  isInternal: z.boolean().default(true),
});

const couponSchema = z.object({
  code: z.string().min(3).max(24).transform((v) => v.toUpperCase().trim()),
  description: z.string().max(200).optional().or(z.literal("")),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const productUpdateSchema = z.object({
  productId: z.string().min(1),
  basePrice: z.number().min(1).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isBestseller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
});

const enquiryStatusSchema = z.object({
  enquiryId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"]),
  adminNotes: z.string().max(2000).optional().or(z.literal("")),
});

const settingsSchema = z.object({
  defaultGstRate: z.number().min(0).max(40),
  defaultShippingFee: z.number().min(0).max(10000),
  freeShippingThreshold: z.number().min(0).max(1000000),
});

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export async function adminUpdateOrderStatus(input: z.infer<typeof statusSchema>): Promise<ApiResponse<{ status: OrderStatus }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid status update.", "VALIDATION");

  const { orderId, status, note } = parsed.data;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Order not found.", "NOT_FOUND");

  // Guard: don't let staff move orders with a cart/payment state machine that
  // doesn't make sense (e.g. DELIVERED → IN_PRODUCTION).
  const currentIndex = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const nextIndex = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);
  const movingForward = currentIndex === -1 || nextIndex === -1 || nextIndex >= currentIndex;
  const isException = status === "CANCELLED" || status === "REFUND_REQUESTED" || status === "REFUNDED";
  if (!movingForward && !isException && order.status !== status) {
    return fail(`Cannot move an order from ${order.status} to ${status}.`, "INVALID_TRANSITION");
  }

  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          shippedAt: status === "SHIPPED" ? (order.shippedAt ?? new Date()) : order.shippedAt,
          deliveredAt: status === "DELIVERED" ? (order.deliveredAt ?? new Date()) : order.deliveredAt,
          cancelReason: status === "CANCELLED" ? (note || "Cancelled by admin") : order.cancelReason,
        },
      }),
      prisma.orderNote.create({
        data: {
          orderId,
          authorId: admin.id,
          body: note || `Status changed to ${status} by ${admin.name ?? "staff"}.`,
          isInternal: !note, // customer-visible when a message accompanies the change
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: orderId,
          data: { from: order.status, to: status, note: note || null },
        },
      }),
    ]);

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/admin/orders");

    // WhatsApp triggers on the moments customers actually watch for: the
    // request being accepted, and the order leaving us (dispatch / pickup).
    const isPickup = order.shippingMethod === "PICKUP";
    const becameAccepted = order.status === "PENDING_PAYMENT" && !isException && status !== "PENDING_PAYMENT";
    const becameDispatched = status === "SHIPPED" && !isPickup;
    const becamePickupReady = status === "PACKED" && isPickup;

    if (becameAccepted || becameDispatched || becamePickupReady) {
      try {
        const { sendWhatsapp, requestAcceptedMessage, shippedMessage, pickupReadyMessage } = await import(
          "@/lib/whatsapp"
        );
        let message: string;
        let label: string;

        if (becameDispatched) {
          label = "dispatch";
          message = shippedMessage({
            orderNumber: order.orderNumber,
            courier: order.courier,
            trackingNumber: order.trackingNumber,
            trackingUrl: order.trackingUrl,
          });
        } else if (becamePickupReady) {
          label = "pickup ready";
          message = pickupReadyMessage({
            orderNumber: order.orderNumber,
            store: `${PICKUP_STORE.mall}, ${PICKUP_STORE.area}`,
            unit: pickupUnit(),
            note,
          });
        } else {
          label = "request accepted";
          message = requestAcceptedMessage({ orderNumber: order.orderNumber, note });
        }

        const result = await sendWhatsapp({ to: order.whatsappPhone ?? order.phone, message });
        if (result.fallbackUrl) {
          await prisma.orderNote.create({
            data: {
              orderId,
              authorId: admin.id,
              body: `WhatsApp "${label}" not auto-sent (no API keys). Send manually: ${result.fallbackUrl}`,
              isInternal: true,
            },
          });
        }
      } catch (error) {
        console.error("[admin] whatsapp status ping", error);
      }
    }

    return ok({ status });
  } catch (error) {
    console.error("[admin] status", error);
    return fail("Could not update the order.");
  }
}

export async function adminSetTracking(input: z.infer<typeof trackingSchema>): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = trackingSchema.safeParse(input);
  if (!parsed.success) return fail("Check the tracking details.", "VALIDATION");

  try {
    const current = await prisma.order.findUnique({ where: { id: parsed.data.orderId }, select: { status: true } });
    if (!current) return fail("Order not found.", "NOT_FOUND");

    await prisma.order.update({
      where: { id: parsed.data.orderId },
      data: {
        courier: parsed.data.courier,
        trackingNumber: parsed.data.trackingNumber,
        trackingUrl: parsed.data.trackingUrl || null,
        // Attaching tracking implies dispatch when the order is still packed.
        ...(current.status === "PACKED" ? { status: "SHIPPED" as OrderStatus } : {}),
        shippedAt: new Date(),
      },
    });
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    revalidatePath(`/orders/${parsed.data.orderId}`);

    // Dispatch WhatsApp: the parcel just left us.
    try {
      const order = await prisma.order.findUnique({
        where: { id: parsed.data.orderId },
        select: { orderNumber: true, whatsappPhone: true, phone: true, shippingMethod: true },
      });
      if (order && order.shippingMethod !== "PICKUP") {
        const { sendWhatsapp, shippedMessage } = await import("@/lib/whatsapp");
        void sendWhatsapp({
          to: order.whatsappPhone ?? order.phone,
          message: shippedMessage({
            orderNumber: order.orderNumber,
            courier: parsed.data.courier,
            trackingNumber: parsed.data.trackingNumber,
            trackingUrl: parsed.data.trackingUrl,
          }),
        });
      }
    } catch (error) {
      console.error("[admin] whatsapp dispatch ping", error);
    }

    return ok({ saved: true });
  } catch (error) {
    console.error("[admin] tracking", error);
    return fail("Could not save tracking details.");
  }
}

export async function adminAddOrderNote(input: z.infer<typeof noteSchema>): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail("Write a note first.", "VALIDATION");

  try {
    await prisma.orderNote.create({
      data: { orderId: parsed.data.orderId, authorId: admin.id, body: parsed.data.body, isInternal: parsed.data.isInternal },
    });
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return ok({ saved: true });
  } catch {
    return fail("Could not save the note.");
  }
}

export async function adminNotifyCustomer(orderId: string, message?: string): Promise<ApiResponse<{ sent: boolean }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Order not found.", "NOT_FOUND");

  try {
    const { delivered } = await sendEmail(
      orderStatusEmail({
        to: order.email,
        orderNumber: order.orderNumber,
        status: order.status,
        note: message || undefined,
        trackingUrl: order.trackingUrl ?? undefined,
      }),
    );
    await prisma.orderNote.create({
      data: { orderId, authorId: admin.id, body: `Status email sent to ${order.email}.`, isInternal: true },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return ok({ sent: delivered });
  } catch (error) {
    console.error("[admin] notify", error);
    return fail("Could not send the email.");
  }
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export async function adminUpdateProduct(input: z.infer<typeof productUpdateSchema>): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid product update.", "VALIDATION");

  try {
    const { productId, ...changes } = parsed.data;
    await prisma.product.update({
      where: { id: productId },
      data: {
        ...(changes.basePrice !== undefined ? { basePrice: changes.basePrice } : {}),
        ...(changes.status !== undefined ? { status: changes.status as ProductStatus } : {}),
        ...(changes.isBestseller !== undefined ? { isBestseller: changes.isBestseller } : {}),
        ...(changes.isNewArrival !== undefined ? { isNewArrival: changes.isNewArrival } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "PRODUCT_UPDATED", entityType: "Product", entityId: productId, data: changes },
    });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return ok({ saved: true });
  } catch (error) {
    console.error("[admin] product", error);
    return fail("Could not update the product.");
  }
}

const variantStockSchema = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(0).max(100000),
});

export async function adminUpdateVariantStock(input: z.infer<typeof variantStockSchema>): Promise<ApiResponse<{ stock: number }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = variantStockSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid stock value.", "VALIDATION");

  try {
    const variant = await prisma.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { stock: parsed.data.stock },
    });
    revalidatePath("/admin/products");
    return ok({ stock: variant.stock });
  } catch {
    return fail("Could not update stock.");
  }
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                     */
/* -------------------------------------------------------------------------- */

export async function adminSaveCoupon(input: z.infer<typeof couponSchema> & { id?: string }): Promise<ApiResponse<{ id: string }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = couponSchema.extend({ id: z.string().optional() }).safeParse(input);
  if (!parsed.success) {
    return fail("Please check the coupon fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { id, ...data } = parsed.data;
  if (data.type === "PERCENTAGE" && data.value > 100) return fail("Percentage can't exceed 100.", "VALIDATION");
  if (data.type === "FREE_SHIPPING") data.value = 0;

  try {
    const payload: Prisma.CouponUncheckedCreateInput = {
      code: data.code,
      description: data.description || null,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount ?? null,
      usageLimit: data.usageLimit ?? null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      productIds: [],
      categoryIds: [],
    };

    const coupon = id
      ? await prisma.coupon.update({ where: { id }, data: payload })
      : await prisma.coupon.create({ data: payload });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "COUPON_UPDATED" : "COUPON_CREATED",
        entityType: "Coupon",
        entityId: coupon.id,
        data: { code: coupon.code },
      },
    });
    revalidatePath("/admin/coupons");
    return ok({ id: coupon.id });
  } catch (error) {
    console.error("[admin] coupon", error);
    if ((error as { code?: string }).code === "P2002") return fail("That coupon code already exists.", "DUPLICATE");
    return fail("Could not save the coupon.");
  }
}

export async function adminToggleCoupon(id: string, isActive: boolean): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");
  try {
    await prisma.coupon.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/coupons");
    return ok({ saved: true });
  } catch {
    return fail("Could not update the coupon.");
  }
}

/* -------------------------------------------------------------------------- */
/* Bulk enquiries                                                              */
/* -------------------------------------------------------------------------- */

export async function adminUpdateEnquiry(input: z.infer<typeof enquiryStatusSchema>): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = enquiryStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid enquiry update.", "VALIDATION");

  try {
    await prisma.bulkEnquiry.update({
      where: { id: parsed.data.enquiryId },
      data: {
        status: parsed.data.status as BulkEnquiryStatus,
        ...(parsed.data.adminNotes !== undefined ? { adminNotes: parsed.data.adminNotes || null } : {}),
      },
    });
    revalidatePath("/admin/enquiries");
    return ok({ saved: true });
  } catch {
    return fail("Could not update the enquiry.");
  }
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export async function adminSaveSettings(input: z.infer<typeof settingsSchema>): Promise<ApiResponse<{ saved: true }>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Check the settings values.", "VALIDATION");

  try {
    const entries: [string, number][] = [
      ["defaultGstRate", parsed.data.defaultGstRate],
      ["defaultShippingFee", parsed.data.defaultShippingFee],
      ["freeShippingThreshold", parsed.data.freeShippingThreshold],
    ];
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "SETTINGS_UPDATED", entityType: "Setting", data: parsed.data },
    });
    invalidateSettingsCache();
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    return ok({ saved: true });
  } catch (error) {
    console.error("[admin] settings", error);
    return fail("Could not save settings.");
  }
}

/* -------------------------------------------------------------------------- */
/* Dashboard data                                                              */
/* -------------------------------------------------------------------------- */

export interface AdminStats {
  revenue: number;
  paidOrders: number;
  pendingReview: number;
  inProduction: number;
  newEnquiries: number;
  lowStock: { name: string; size: string; color: string; stock: number }[];
  revenueByDay: { day: string; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  recentOrders: { id: string; status: string }[];
}

export async function getAdminStats(): Promise<ApiResponse<AdminStats>> {
  const admin = await requireAdmin();
  if (!admin) return fail("Admin access required.", "FORBIDDEN");

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [paidOrders, statusGroups, enquiryCount, lowStock, recentOrders, productGroups] = await Promise.all([
      prisma.order.findMany({
        where: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"] } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.bulkEnquiry.count({ where: { status: "NEW" } }),
      prisma.productVariant.findMany({
        where: { stock: { lte: 5 } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: "asc" },
        take: 8,
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, status: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    const revenue = paidOrders.reduce((sum, o) => sum + num(o.total), 0);

    // 30-day revenue chart buckets
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const order of paidOrders) {
      if (order.createdAt < since) continue;
      const key = order.createdAt.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + num(order.total));
    }

    const countFor = (status: string) => statusGroups.find((g) => g.status === status)?._count._all ?? 0;

    return ok({
      revenue,
      paidOrders: paidOrders.length,
      pendingReview: countFor("ARTWORK_REVIEW"),
      inProduction: countFor("IN_PRODUCTION") + countFor("QUALITY_CHECK"),
      newEnquiries: enquiryCount,
      lowStock: lowStock.map((v) => ({
        name: v.product.name,
        size: v.size,
        color: v.colorName,
        stock: v.stock,
      })),
      revenueByDay: [...buckets.entries()].map(([day, value]) => ({ day, revenue: value })),
      statusBreakdown: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      topProducts: productGroups.map((g) => ({
        name: g.productName,
        units: g._sum.quantity ?? 0,
        revenue: num(g._sum.lineTotal ?? 0),
      })),
      recentOrders: recentOrders.map((o) => ({ id: o.id, status: o.status })),
    });
  } catch (error) {
    console.error("[admin] stats", error);
    return fail("Could not load dashboard data.");
  }
}

export async function requireUserOrAdmin() {
  return (await requireAdmin()) ?? (await requireUser());
}
