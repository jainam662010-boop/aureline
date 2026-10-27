import * as React from "react";
import { Check, CircleDashed, Package, Truck, PartyPopper, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

export const ORDER_FLOW = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "ARTWORK_REVIEW",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

export const STATUS_META: Record<
  string,
  { label: string; description: string; tone: "brand" | "pink" | "violet" | "cyan" | "success" | "warning" | "danger" | "muted" }
> = {
  PENDING_PAYMENT: { label: "Pending payment", description: "Awaiting payment confirmation.", tone: "warning" },
  PAYMENT_CONFIRMED: { label: "Payment confirmed", description: "We've received your payment.", tone: "cyan" },
  ARTWORK_REVIEW: { label: "Artwork review", description: "Our team is checking your design for print quality.", tone: "pink" },
  IN_PRODUCTION: { label: "In production", description: "Printing and heat-curing your order.", tone: "violet" },
  QUALITY_CHECK: { label: "Quality check", description: "Inspecting print density, alignment and finish.", tone: "violet" },
  PACKED: { label: "Packed", description: "Packed and ready for dispatch.", tone: "brand" },
  SHIPPED: { label: "Shipped", description: "On its way to you via express courier.", tone: "brand" },
  DELIVERED: { label: "Delivered", description: "Delivered. Enjoy — and tag us!", tone: "success" },
  CANCELLED: { label: "Cancelled", description: "This order was cancelled.", tone: "danger" },
  REFUND_REQUESTED: { label: "Refund requested", description: "Refund requested and under review.", tone: "warning" },
  REFUNDED: { label: "Refunded", description: "Refund processed to the original payment method.", tone: "muted" },
};

const TONE_CLASS: Record<string, string> = {
  brand: "text-[#2563EB] border-[#2563EB]/40 bg-[#2563EB]/10",
  pink: "text-[#0284C7] border-[#0EA5E9]/40 bg-[#0EA5E9]/10",
  violet: "text-[#6D28D9] border-[#7C3AED]/40 bg-[#7C3AED]/10",
  cyan: "text-[#0E7490] border-[#0891B2]/40 bg-[#0891B2]/10",
  success: "text-[#047857] border-[#22c55e]/40 bg-[#22c55e]/10",
  warning: "text-[#B45309] border-[#D97706]/40 bg-[#D97706]/10",
  danger: "text-[#BE123C] border-[#F43F5E]/40 bg-[#E11D48]/25",
  muted: "text-slate-600 border-slate-900/[0.1] bg-slate-900/[0.05]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "muted" as const };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-label-technical text-label-technical uppercase tracking-widest backdrop-blur-md",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function StatusTimeline({
  status,
  shippedAt,
  deliveredAt,
}: {
  status: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}) {
  const terminal = ["CANCELLED", "REFUND_REQUESTED", "REFUNDED"].includes(status);
  const currentIndex = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);

  if (terminal) {
    return (
      <div className={cn("glass-panel-sm p-space-md flex items-center gap-space-sm", status === "CANCELLED" && "border-[#E11D48]/50")}>
        <XCircle className="size-5 text-[#BE123C]" />
        <div>
          <p className="font-label-lg text-label-lg text-slate-900">{STATUS_META[status]?.label ?? status}</p>
          <p className="font-body-sm text-body-sm text-slate-600">{STATUS_META[status]?.description}</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {ORDER_FLOW.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const Icon = done ? Check : active ? CircleDashed : index === 6 ? Truck : index === 7 ? PartyPopper : CircleDashed;
        const stamp =
          step === "SHIPPED" && shippedAt ? formatDateTime(shippedAt) : step === "DELIVERED" && deliveredAt ? formatDateTime(deliveredAt) : null;

        return (
          <li key={step} className="relative flex gap-space-sm pb-6 last:pb-0">
            {index < ORDER_FLOW.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 bottom-0 w-px",
                  done ? "bg-gradient-to-b from-[#2563EB] to-[#0EA5E9]" : "bg-slate-900/[0.05]",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-8 flex-shrink-0 items-center justify-center rounded-full border",
                done
                  ? "border-transparent bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] text-white"
                  : active
                    ? "border-[#0EA5E9] bg-[#0EA5E9]/15 text-[#0284C7] animate-pulse"
                    : "border-slate-900/[0.1] bg-slate-900/[0.03] text-slate-400",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="pt-1 min-w-0">
              <p className={cn("font-label-lg text-label-lg", done || active ? "text-slate-900" : "text-slate-500")}>
                {STATUS_META[step]?.label ?? step}
                {active ? <span className="ml-2 font-label-technical text-[9px] text-[#0EA5E9] uppercase">Current</span> : null}
              </p>
              <p className="font-body-sm text-body-sm text-slate-500">{STATUS_META[step]?.description}</p>
              {stamp ? <p className="font-label-technical text-[9px] text-slate-500 mt-1">{stamp}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ReorderHint() {
  return (
    <span className="inline-flex items-center gap-1 font-body-sm text-body-sm text-slate-500">
      <RotateCcw className="size-3.5" /> Reorder adds the same designs back to your cart.
    </span>
  );
}

export { Package };
