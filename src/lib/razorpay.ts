import "server-only";
import Razorpay from "razorpay";
import crypto from "crypto";
import { inrPaise } from "@/lib/utils";

let client: Razorpay | null = null;

export function razorpayEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay(): Razorpay {
  if (!razorpayEnabled()) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

export interface CreateRazorpayOrderInput {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}

/** Creates a Razorpay order. `amount` is converted to paise server-side. */
export async function createRazorpayOrder(input: CreateRazorpayOrderInput) {
  const rzp = getRazorpay();
  return rzp.orders.create({
    amount: inrPaise(input.amountRupees),
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes ?? {},
    partial_payment: false,
  });
}

/** HMAC SHA-256 signature verification (Razorpay checkout handshake). */
export function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  signature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Verifies a Razorpay webhook signature. */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function fetchPayment(paymentId: string) {
  return getRazorpay().payments.fetch(paymentId);
}

export async function createRefund(paymentId: string, amountRupees?: number) {
  const rzp = getRazorpay();
  return rzp.payments.refund(paymentId, amountRupees ? { amount: inrPaise(amountRupees) } : {});
}
