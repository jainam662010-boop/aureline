/**
 * Static-build replacement for src/actions/orders.ts (GitHub Pages demo).
 * Ordering needs the real backend (Prisma + Razorpay + WhatsApp/email), so the
 * static export politely reports that ordering is disabled instead of failing.
 */

/* ---- serialized shapes (mirrors the production module) ---- */
export interface SerializedOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  createdAt: string;
  itemCount: number;
}

export interface SerializedOrderItem {
  id: string;
  productName: string;
  variantSize: string;
  variantColor: string;
  colorHex: string;
  placementKey: string;
  side: "FRONT" | "BACK";
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
  status: string;
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
  paymentStatus: string;
}

import type { ApiResponse } from "@/lib/response";

const DISABLED =
  "Orders are disabled in this static demo build. Run the app with a database (or deploy on Vercel) for the full checkout.";

const notEnveloped = { sent: false } as const;

export async function startCheckout(_input: unknown): Promise<ApiResponse<{ orderId: string; razorpayOrderId: string | null; razorpayKeyId: string | null; amountRupees: number; demoMode: boolean }>> {
  return { ok: false, error: DISABLED };
}

export async function verifyPayment(_input: unknown): Promise<ApiResponse<{ orderNumber: string; orderId: string }>> {
  return { ok: false, error: DISABLED };
}

export async function recordPaymentFailure(_input: unknown): Promise<ApiResponse<{ recorded: boolean }>> {
  return { ok: false, error: DISABLED };
}

export async function listMyOrders(): Promise<ApiResponse<SerializedOrder[]>> {
  return { ok: true, data: [] };
}

export async function getOrder(_orderId: string): Promise<ApiResponse<SerializedOrder | null>> {
  return { ok: false, error: DISABLED };
}

export async function trackOrder(_input: { identifier: string }): Promise<ApiResponse<SerializedOrder | null>> {
  return { ok: false, error: "Order tracking needs the full backend and is unavailable in this static demo." };
}

export async function reorder(_orderId: string): Promise<ApiResponse<{ count: number }>> {
  return { ok: false, error: DISABLED };
}

export async function notifyOrderStatus(_orderId: string, _status: string, _note?: string): Promise<{ sent: boolean }> {
  return notEnveloped as { sent: boolean };
}
