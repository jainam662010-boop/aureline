import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, razorpayEnabled } from "@/lib/razorpay";
import { sendEmail, orderConfirmationEmail } from "@/lib/mail";

/**
 * Razorpay webhook: payment.captured / payment.failed / order.paid.
 *
 * Signature is verified against the RAW request body using
 * RAZORPAY_WEBHOOK_SECRET — never trust the JSON payload alone. The checkout
 * server action performs the same transition optimistically after the client
 * verification; this route is the authoritative fallback (and the only path
 * that works if the buyer closes the tab mid-verification).
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.STATIC_EXPORT === "1") {
    return NextResponse.json({ ok: false, error: "Payments are not available in the static demo build." }, { status: 503 });
  }
  if (!razorpayEnabled()) {
    return NextResponse.json({ ok: false, error: "Razorpay is not configured." }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; error?: string } };
      order?: { entity?: { id?: string; receipt?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed JSON." }, { status: 400 });
  }

  const paymentId = event.payload?.payment?.entity?.id ?? null;
  const rzpOrderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id ?? null;

  try {
    // Locate our order through the Payment record created at checkout.
    const payment = rzpOrderId
      ? await prisma.payment.findFirst({ where: { razorpayOrderId: rzpOrderId }, include: { order: true } })
      : paymentId
        ? await prisma.payment.findFirst({ where: { razorpayPaymentId: paymentId }, include: { order: true } })
        : null;

    if (!payment?.order) {
      // Not fatal — the order may not exist yet or belongs to another flow.
      return NextResponse.json({ ok: true, ignored: true });
    }

    const order = payment.order;

    if (event.event === "payment.failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: event.payload?.payment?.entity?.error ?? "Payment failed" },
      });
      return NextResponse.json({ ok: true });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "CAPTURED", razorpayPaymentId: paymentId ?? payment.razorpayPaymentId },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_CONFIRMED",
            // Audit trail lives in OrderNote (isInternal for system events).
            notes: {
              create: {
                body: `Payment captured${paymentId ? ` (Razorpay ${paymentId})` : ""}.`,
                isInternal: true,
              },
            },
          },
        }),
      ]);

      // Confirmation email only if we haven't already marked it paid.
      if (payment.status !== "CAPTURED") {
        const fullOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (fullOrder) {
          sendEmail(
            orderConfirmationEmail({
              to: fullOrder.email,
              orderNumber: fullOrder.orderNumber,
              total: `₹${Math.round(Number(fullOrder.total)).toLocaleString("en-IN")}`,
              items: fullOrder.items.map((i) => ({ name: `${i.productName} (${i.variantSize})`, qty: i.quantity })),
              trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/orders/${fullOrder.id}`,
            }),
          )
            .then(({ delivered }) =>
              prisma.auditLog.create({
                data: {
                  action: "EMAIL_SENT",
                  entityType: "Order",
                  entityId: order.id,
                  data: { template: "orderConfirmation", delivered },
                },
              }),
            )
            .catch((error) => console.error("[webhook] confirmation email", error));
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("[webhook]", event.event, error);
    return NextResponse.json({ ok: false, error: "Webhook processing failed." }, { status: 500 });
  }
}
