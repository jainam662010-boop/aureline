"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackOrder } from "@/actions/orders";
import type { SerializedOrder } from "@/actions/orders";
import { StatusBadge, StatusTimeline } from "@/components/orders/order-status";
import { OrderItemsTable } from "@/components/orders/order-items";
import { formatDateTime, formatINR } from "@/lib/utils";

export function TrackForm() {
  const [identifier, setIdentifier] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [order, setOrder] = React.useState<SerializedOrder | null>(null);
  const [notFound, setNotFound] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim().length < 3) {
      toast.error("Enter an order number or email.");
      return;
    }
    setBusy(true);
    setNotFound(null);
    setOrder(null);
    const result = await trackOrder({ identifier: identifier.trim() });
    setBusy(false);
    if (result.ok) {
      setOrder(result.data);
    } else {
      setNotFound(result.error);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-space-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 pointer-events-none" />
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Order number (ARC-XXXXXX) or email"
            aria-label="Order number or email"
            className="h-13 pl-11 rounded-full text-body-md"
          />
        </div>
        <Button type="submit" size="lg" className="h-13 px-space-lg rounded-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PackageSearch className="size-4" />}
          {busy ? "Searching…" : "Track order"}
        </Button>
      </form>

      {notFound ? (
        <div className="mt-space-md rounded-2xl border border-[#E11D48]/50 bg-[#E11D48]/20 p-space-md">
          <p className="font-label-lg text-label-lg text-[#BE123C]">Order not found</p>
          <p className="font-body-sm text-body-sm text-slate-600 mt-1">{notFound}</p>
        </div>
      ) : null}

      {order ? (
        <div className="mt-space-md glass-panel p-space-md">
          <div className="flex items-start justify-between gap-space-sm flex-wrap mb-space-md">
            <div>
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="font-headline-md text-headline-md font-bold text-slate-900">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="font-body-sm text-body-sm text-slate-500 mt-1">
                Placed {formatDateTime(order.createdAt)} · {order.items.length} item(s)
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">
                {formatINR(order.total, true)}
              </span>
              <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
                {order.shippingMethod.toLowerCase()} shipping
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            <StatusTimeline status={order.status} shippedAt={order.shippedAt} deliveredAt={order.deliveredAt} />

            <div className="flex flex-col gap-space-sm">
              <OrderItemsTable items={order.items} />

              <div className="glass-panel-sm p-space-sm">
                <p className="label-tech mb-0">Shipping to</p>
                <p className="font-body-sm text-body-sm text-slate-700 leading-relaxed">
                  {order.shippingFullName} · {order.shippingLine1}
                  {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}, {order.shippingCity},{" "}
                  {order.shippingState} {order.shippingPincode}
                </p>
              </div>

              {order.trackingNumber ? (
                <div className="glass-panel-sm p-space-sm">
                  <p className="label-tech mb-0">{order.courier ?? "Courier"} tracking</p>
                  <p className="font-label-lg text-label-lg text-slate-900">{order.trackingNumber}</p>
                  {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-label-md text-label-md text-[#0891B2] hover:underline"
                    >
                      Track on courier site →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
