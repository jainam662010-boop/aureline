import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { num, formatINR, formatDate } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Renders a print-ready tax invoice (HTML). Customers open it in a new tab and
 * use the browser's "Save as PDF". Guests cannot access other people's invoices.
 */
export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT === "1") return [{ orderId: "demo" }];
  return [];
}

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (process.env.STATIC_EXPORT === "1") {
    return new NextResponse(
      JSON.stringify({ ok: false, error: "Invoices are not available in the static demo build." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }
  const { orderId } = await params;
  const session = await getServerSession(authOptions);

  const order = await prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
    include: { items: true, payments: true, user: { select: { name: true } } },
  });

  if (!order) return new NextResponse("Order not found", { status: 404 });
  if (!session?.user?.id || (order.userId !== session.user.id && session.user.role === "USER")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const gstOnOrder = num(order.taxAmount);
  const taxableValue = num(order.subtotal) - num(order.discountAmount);
  const cgst = gstOnOrder / 2;
  const sgst = gstOnOrder / 2;
  const invoiceNumber = `INV-${order.orderNumber.replace("ARC-", "")}`;

  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.productName)}</strong><br/>
          <span class="muted">${item.variantColor} · Size ${item.variantSize} · ${item.side.toLowerCase()} print · Custom designed</span>
        </td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatINR(num(item.unitPrice), true)}</td>
        <td class="num">${formatINR(num(item.lineTotal), true)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Tax Invoice ${invoiceNumber}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 40px; background: #fff; }
  .wrap { max-width: 800px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 16px; }
  h1 { font-size: 26px; margin: 0; letter-spacing: -0.5px; }
  .brand { font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-size: 18px; }
  .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #ddd; font-size: 13px; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: 320px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .grand { border-top: 2px solid #111; font-weight: 700; font-size: 16px; margin-top: 6px; padding-top: 10px; }
  .gstin { font-size: 11px; color: #444; margin-top: 24px; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <div class="brand">${escapeHtml(APP_NAME)}</div>
      <div class="muted">Custom DTF print atelier · New Delhi, India</div>
      <div class="muted">support@aureline.in · +91 98765 43210</div>
    </div>
    <div style="text-align:right">
      <h1>Tax Invoice</h1>
      <div class="muted">${invoiceNumber}</div>
      <div class="muted">Date: ${formatDate(order.createdAt)}</div>
      <div class="muted">Order: ${escapeHtml(order.orderNumber)}</div>
    </div>
  </header>

  <div class="grid">
    <div>
      <strong>Billed &amp; shipped to</strong>
      <p>
        ${escapeHtml(order.shippingFullName)}<br/>
        ${escapeHtml(order.shippingLine1)}<br/>
        ${order.shippingLine2 ? `${escapeHtml(order.shippingLine2)}<br/>` : ""}
        ${escapeHtml(order.shippingCity)}, ${escapeHtml(order.shippingState)} ${escapeHtml(order.shippingPincode)}<br/>
        ${escapeHtml(order.phone ?? "")} · ${escapeHtml(order.email)}
      </p>
    </div>
    <div style="text-align:right">
      <strong>Payment</strong>
      <p>
        Status: ${order.payments[0]?.status ?? "PENDING"}<br/>
        ${order.payments[0]?.razorpayPaymentId ? `Ref: ${escapeHtml(order.payments[0].razorpayPaymentId)}<br/>` : ""}
        Method: ${escapeHtml(order.payments[0]?.method ?? "Online")}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Taxable value</span><span>${formatINR(taxableValue, true)}</span></div>
    ${num(order.discountAmount) > 0 ? `<div><span>Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</span><span>− ${formatINR(num(order.discountAmount), true)}</span></div>` : ""}
    <div><span>CGST (9%)</span><span>${formatINR(cgst, true)}</span></div>
    <div><span>SGST (9%)</span><span>${formatINR(sgst, true)}</span></div>
    <div><span>Shipping</span><span>${num(order.shippingAmount) > 0 ? formatINR(num(order.shippingAmount), true) : "Free"}</span></div>
    <div class="grand"><span>Total</span><span>${formatINR(num(order.total), true)}</span></div>
  </div>

  <p class="gstin">
    GSTIN: 07ABCDE1234F1Z5 (sample) · HSN/SAC: 610910 (T-shirts) · Place of supply: Delhi · Reverse charge: No
  </p>

  <footer>
    This is a computer-generated invoice and does not require a physical signature. Prices include GST where applicable.
    For support, quote ${escapeHtml(order.orderNumber)}.
    <div class="no-print" style="margin-top:12px"><button onclick="window.print()">Print / Save as PDF</button></div>
  </footer>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(input: string | null | undefined): string {
  return (input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
