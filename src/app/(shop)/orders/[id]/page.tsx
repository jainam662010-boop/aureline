import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrder } from "@/actions/orders";
import { prisma } from "@/lib/prisma";
import { StatusBadge, StatusTimeline } from "@/components/orders/order-status";
import { OrderItemsTable } from "@/components/orders/order-items";
import { InvoiceButton, ReorderButton } from "@/components/orders/order-items";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { StaticNotice } from "@/components/shared/static-notice";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // Static export: satisfy route validation with one placeholder (the page
  // itself renders a demo notice in static builds).
  if (process.env.STATIC_EXPORT === "1") return [{ id: "demo" }];
  return [];
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.STATIC_EXPORT === "1") {
    return (
      <div className="max-w-6xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
        <StaticNotice
          title="Order details need the live backend"
          description="Order records, invoice PDFs and tracking live in the database, which isn't part of this static demo build."
        />
      </div>
    );
  }
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/orders/${id}`);

  const result = await getOrder(id);
  if (!result.ok || !result.data) notFound();
  const order = result.data;

  const notes = await prisma.orderNote.findMany({
    where: { orderId: order.id, isInternal: false },
    orderBy: { createdAt: "asc" },
  });

  const trackingHref = order.trackingUrl ?? (order.trackingNumber ? `https://www.google.com/search?q=${order.trackingNumber}` : null);

  return (
    <div className="max-w-6xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <nav aria-label="Breadcrumb" className="mb-space-md">
        <ol className="flex items-center gap-space-xs font-label-technical text-label-technical uppercase tracking-widest text-white/40">
          <li><Link href="/orders" className="hover:text-white transition-colors">Orders</Link></li>
          <li aria-hidden>/</li>
          <li className="text-white/80">{order.orderNumber}</li>
        </ol>
      </nav>

      <div className="flex items-start justify-between gap-space-md flex-wrap mb-space-lg">
        <div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="font-body-md text-body-md text-white/60 mt-space-xs">
            Placed {formatDateTime(order.createdAt)} · {order.items.length} item(s) ·{" "}
            {order.paymentStatus === "CAPTURED"
              ? "Paid via Razorpay"
              : order.status === "PENDING_PAYMENT"
                ? "Request awaiting acceptance · we will confirm on WhatsApp"
                : `Payment: ${order.paymentStatus ?? "pending"}`}
          </p>
        </div>
        <div className="flex items-center gap-space-xs">
          <InvoiceButton order={order} />
          <ReorderButton orderId={order.id} />
          <a
            href={`mailto:support@aureline.in?subject=${encodeURIComponent(`Order ${order.orderNumber}`)}`}
            className="inline-flex items-center gap-2 rounded-full font-label-lg text-label-lg text-white/85 bg-white/[0.06] border border-white/15 px-4 h-11 hover:bg-white/[0.12] transition-all"
          >
            <MessageCircle className="size-4" /> Support
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsTable items={order.items} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent className="font-body-md text-body-md text-white/70 leading-relaxed">
                <p className="text-white font-label-lg text-label-lg">{order.shippingFullName}</p>
                <p>{order.shippingLine1}</p>
                {order.shippingLine2 ? <p>{order.shippingLine2}</p> : null}
                <p>
                  {order.shippingCity}, {order.shippingState} {order.shippingPincode}
                </p>
                <p className="mt-2 text-white/50">{order.phone}</p>
                <p className="text-white/50">{order.email}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-space-xs font-body-md text-body-md">
                  <Row label="Subtotal" value={formatINR(order.subtotal, true)} />
                  {order.discountAmount > 0 ? (
                    <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatINR(order.discountAmount, true)}`} accent />
                  ) : null}
                  <Row label={`Shipping (${order.shippingMethod.toLowerCase()})`} value={order.shippingAmount > 0 ? formatINR(order.shippingAmount, true) : "Free"} />
                  <Row label="GST" value={formatINR(order.taxAmount, true)} />
                  <div className="flex items-center justify-between pt-space-sm mt-space-xs border-t border-white/[0.08]">
                    <dt className="font-label-lg text-label-lg text-white">Total</dt>
                    <dd className="font-headline-md text-headline-md font-bold text-white tabular-nums">
                      {formatINR(order.total, true)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {notes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Updates from the atelier</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-space-sm">
                {notes.map((note) => (
                  <div key={note.id} className="glass-panel-sm p-space-sm">
                    <p className="font-body-md text-body-md text-white/80">{note.body}</p>
                    <p className="font-label-technical text-[9px] text-white/40 mt-1">{formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Tracking timeline</CardTitle>
              {order.etaDate ? (
                <p className="font-body-sm text-body-sm text-white/50">
                  Estimated delivery: <span className="text-white">{formatDate(order.etaDate)}</span>
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <StatusTimeline status={order.status} shippedAt={order.shippedAt} deliveredAt={order.deliveredAt} />

              {order.trackingNumber ? (
                <div className="mt-space-md glass-panel-sm p-space-sm">
                  <p className="label-tech mb-0">{order.courier ?? "Courier"}</p>
                  <p className="font-label-lg text-label-lg text-white">{order.trackingNumber}</p>
                  {trackingHref ? (
                    <a
                      href={trackingHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-label-md text-label-md text-[#00E0F2] hover:underline"
                    >
                      Track on courier site →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-[#7ef0a8]" : "text-white/85"}`}>{value}</dd>
    </div>
  );
}
