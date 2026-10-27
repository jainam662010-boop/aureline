"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package, RotateCcw, ArrowRight } from "lucide-react";
import { StatusBadge, STATUS_META, ReorderHint } from "@/components/orders/order-status";
import { GarmentMockup, garmentTypeFromCategory } from "@/components/shared/garment-mockup";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { reorder } from "@/actions/orders";
import type { SerializedOrder } from "@/actions/orders";
import { formatDate, formatINR } from "@/lib/utils";

export function OrdersList({ orders }: { orders: SerializedOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const handleReorder = async (orderId: string) => {
    setBusy(orderId);
    const result = await reorder(orderId);
    setBusy(null);
    if (result.ok) {
      if (result.data.count === 0) {
        toast.warning("Some items from this order are no longer available.");
      } else {
        toast.success(`Added ${result.data.count} item(s) back to your cart`, {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      }
    } else {
      toast.error(result.error);
    }
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title="No orders yet"
        description="When you place your first order it'll show up here with live production tracking."
        action={
          <Link href="/products" className="btn-gradient px-space-lg py-space-sm">
            Start designing <ArrowRight className="size-4" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      {orders.map((order) => (
        <article key={order.id} className="glass-panel p-space-md">
          <div className="flex items-start justify-between gap-space-sm flex-wrap mb-space-sm">
            <div>
              <div className="flex items-center gap-space-sm flex-wrap">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-headline-md text-headline-md font-bold text-slate-900 hover:text-primary transition-colors"
                >
                  {order.orderNumber}
                </Link>
                <StatusBadge status={order.status} />
              </div>
              <p className="font-body-sm text-body-sm text-slate-500 mt-1">
                Placed {formatDate(order.createdAt)} · {order.items.length} item(s) ·{" "}
                {order.shippingMethod.toLowerCase()} shipping
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">
                {formatINR(order.total, true)}
              </span>
              <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
                {order.paymentStatus ?? "unpaid"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center -space-x-3 flex-1 min-w-0 overflow-hidden">
              {order.items.slice(0, 4).map((item) => (
                <span
                  key={item.id}
                  className="w-12 h-14 rounded-xl bg-slate-900/[0.04] border border-slate-900/[0.1] flex items-center justify-center overflow-hidden flex-shrink-0"
                  title={`${item.productName} (${item.variantSize})`}
                >
                  <GarmentMockup
                    type={garmentTypeFromCategory(item.productName.toLowerCase())}
                    color={item.colorHex}
                    className="h-full w-auto"
                    overlay={
                      item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-contain" draggable={false} />
                      ) : null
                    }
                    overlayStyle={{ top: "26%", left: "30%", width: "40%", height: "26%" }}
                  />
                </span>
              ))}
              {order.items.length > 4 ? (
                <span className="w-12 h-14 rounded-xl bg-slate-900/[0.04] border border-slate-900/[0.1] flex items-center justify-center font-label-technical text-[10px] text-slate-600 flex-shrink-0">
                  +{order.items.length - 4}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-space-xs flex-shrink-0">
              <Button variant="glass" size="sm" onClick={() => handleReorder(order.id)} disabled={busy === order.id}>
                <RotateCcw className="size-3.5" />
                {busy === order.id ? "Adding…" : "Reorder"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/orders/${order.id}`}>
                  Details <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {order.status === "DELIVERED" ? (
            <p className="mt-space-sm">
              <ReorderHint />
            </p>
          ) : null}
          {STATUS_META[order.status] && ["ARTWORK_REVIEW", "IN_PRODUCTION"].includes(order.status) ? (
            <p className="mt-space-sm font-body-sm text-body-sm text-slate-500">
              {STATUS_META[order.status]?.description}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
