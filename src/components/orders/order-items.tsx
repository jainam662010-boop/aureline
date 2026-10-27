"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Download } from "lucide-react";
import { GarmentMockup, garmentTypeFromCategory } from "@/components/shared/garment-mockup";
import { reorder } from "@/actions/orders";
import { formatINR } from "@/lib/utils";

export interface OrderItemShape {
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
  productId: string | null;
}

export function OrderItemsTable({ items }: { items: OrderItemShape[] }) {
  return (
    <ul className="flex flex-col gap-space-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-space-sm pb-space-sm border-b border-slate-900/[0.06] last:border-0 last:pb-0">
          <span className="w-16 h-20 rounded-xl bg-slate-900/[0.04] border border-slate-900/[0.1] flex items-center justify-center overflow-hidden flex-shrink-0">
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
          <div className="flex-1 min-w-0">
            <p className="font-label-lg text-label-lg text-slate-900 truncate">{item.productName}</p>
            <p className="font-body-sm text-body-sm text-slate-500">
              {item.variantColor} · Size {item.variantSize} · {item.side.toLowerCase()} print · ×{item.quantity}
            </p>
            <p className="font-label-technical text-[9px] uppercase tracking-widest text-[#0891B2] mt-0.5">
              Custom design · {formatINR(item.unitPrice)} each
            </p>
          </div>
          <span className="font-label-lg text-label-lg text-slate-900 tabular-nums whitespace-nowrap">
            {formatINR(item.lineTotal)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const handle = async () => {
    setBusy(true);
    const result = await reorder(orderId);
    setBusy(false);
    if (result.ok) {
      toast.success(`Added ${result.data.count} item(s) to your cart`, {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full font-label-lg text-label-lg text-slate-900 backdrop-blur-2xl bg-slate-900/[0.05] border border-slate-900/[0.1] px-4 h-11 hover:bg-slate-900/[0.08] transition-all disabled:opacity-50"
    >
      <RotateCcw className="size-4" /> {busy ? "Adding…" : "Reorder"}
    </button>
  );
}

export function InvoiceButton({ order }: { order: { id: string; orderNumber: string } }) {
  return (
    <Link
      href={`/api/invoice/${order.id}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 rounded-full font-label-lg text-label-lg text-slate-900 bg-slate-900/[0.05] border border-slate-900/[0.1] px-4 h-11 hover:bg-slate-900/[0.09] transition-all"
    >
      <Download className="size-4" /> Invoice
    </Link>
  );
}
