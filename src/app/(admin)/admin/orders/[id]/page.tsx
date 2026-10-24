import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { OrderItemsTable } from "@/components/orders/order-items";
import { StatusTimeline } from "@/components/orders/order-status";
import { OrderManagePanel } from "@/components/admin/order-manage-panel";
import { formatINR, formatDateTime, num } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Manage order" };
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // Static export: satisfy route validation; the admin layout renders a demo
  // notice and never renders this page in static builds.
  if (process.env.STATIC_EXPORT === "1") return [{ id: "demo" }];
  return [];
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const admin = await requireAdmin();
  if (!admin) notFound();

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, role: true } } } },
    },
  });
  if (!order) notFound();

  const serializedItems = order.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    variantSize: item.variantSize,
    variantColor: item.variantColor,
    colorHex: item.colorHex,
    placementKey: item.placementKey,
    side: item.side,
    quantity: item.quantity,
    unitPrice: num(item.unitPrice),
    lineTotal: num(item.lineTotal),
    thumbnailUrl: item.thumbnailUrl,
    designId: item.designId,
    productId: item.productId,
  }));

  const payment = order.payments[0] ?? null;

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex items-start justify-between gap-space-sm flex-wrap">
        <div>
          <Link href="/admin/orders" className="label-tech hover:text-white transition-colors">
            ← All orders
          </Link>
          <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">{order.orderNumber}</h1>
          <p className="font-body-sm text-body-sm text-white/50 mt-1">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="glass-panel px-space-md py-space-sm text-right">
          <p className="font-headline-md text-headline-md font-bold text-white tabular-nums">
            {formatINR(num(order.total), true)}
          </p>
          <p className="font-label-technical text-[9px] uppercase tracking-widest text-white/45">
            {order.shippingMethod.toLowerCase()} · {order.currency}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-space-md">
        <div className="flex flex-col gap-space-md min-w-0">
          <section className="glass-panel p-space-md">
            <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm">Items</h2>
            <OrderItemsTable items={serializedItems} />
          </section>

          <section className="glass-panel p-space-md">
            <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm">Progress</h2>
            <StatusTimeline
              status={order.status}
              shippedAt={order.shippedAt?.toISOString() ?? null}
              deliveredAt={order.deliveredAt?.toISOString() ?? null}
            />
          </section>

          <section className="glass-panel p-space-md">
            <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm">Fulfilment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="glass-panel-sm p-space-sm">
                <p className="label-tech mb-0">Ship to</p>
                <p className="font-body-sm text-body-sm text-white/70 leading-relaxed">
                  {order.shippingFullName}
                  <br />
                  {order.shippingLine1}
                  {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
                  <br />
                  {order.shippingCity}, {order.shippingState} {order.shippingPincode}
                  <br />
                  {order.phone ?? order.email}
                </p>
              </div>
              <div className="glass-panel-sm p-space-sm">
                <p className="label-tech mb-0">Payment</p>
                <p className="font-body-sm text-body-sm text-white/70 leading-relaxed">
                  {payment ? (
                    <>
                      {payment.method ?? "Online"} · {payment.status}
                      <br />
                      {payment.razorpayPaymentId ?? payment.razorpayOrderId}
                      {payment.failureReason ? (
                        <>
                          <br />
                          <span className="text-[#ff9d95]">{payment.failureReason}</span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    "No payment record (demo checkout or unpaid)."
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0">
          <OrderManagePanel
            orderId={order.id}
            status={order.status}
            courier={order.courier}
            trackingNumber={order.trackingNumber}
            trackingUrl={order.trackingUrl}
            whatsappPhone={order.whatsappPhone ?? order.phone}
            orderNumber={order.orderNumber}
            shippingMethod={order.shippingMethod}
            pickupAddress={order.shippingMethod === "PICKUP" ? order.shippingLine1 : null}
            notes={order.notes.map((note) => ({
              id: note.id,
              body: note.body,
              isInternal: note.isInternal,
              author: note.author?.name ?? "System",
              createdAt: note.createdAt.toISOString(),
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
