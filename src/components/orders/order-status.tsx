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
  brand: "text-[#FF6B62] border-[#FF3B30]/40 bg-[#FF3B30]/10",
  pink: "text-[#FF6BC0] border-[#FF0D7B]/40 bg-[#FF0D7B]/10",
  violet: "text-[#B08CFF] border-[#8026F2]/40 bg-[#8026F2]/10",
  cyan: "text-[#66EFFA] border-[#00E0F2]/40 bg-[#00E0F2]/10",
  success: "text-[#7ef0a8] border-[#22c55e]/40 bg-[#22c55e]/10",
  warning: "text-[#FFC084] border-[#FF8C26]/40 bg-[#FF8C26]/10",
  danger: "text-[#ff9d95] border-[#ff5545]/40 bg-[#93000a]/25",
  muted: "text-white/60 border-white/15 bg-white/[0.05]",
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
      <div className={cn("glass-panel-sm p-space-md flex items-center gap-space-sm", status === "CANCELLED" && "border-[#93000a]/50")}>
        <XCircle className="size-5 text-[#ff9d95]" />
        <div>
          <p className="font-label-lg text-label-lg text-white">{STATUS_META[status]?.label ?? status}</p>
          <p className="font-body-sm text-body-sm text-white/55">{STATUS_META[status]?.description}</p>
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
                  done ? "bg-gradient-to-b from-[#FF3B30] to-[#FF0D7B]" : "bg-white/10",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-8 flex-shrink-0 items-center justify-center rounded-full border",
                done
                  ? "border-transparent bg-gradient-to-br from-[#FF3B30] to-[#FF0D7B] text-white"
                  : active
                    ? "border-[#FF0D7B] bg-[#FF0D7B]/15 text-[#FF6BC0] animate-pulse"
                    : "border-white/15 bg-white/[0.03] text-white/30",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="pt-1 min-w-0">
              <p className={cn("font-label-lg text-label-lg", done || active ? "text-white" : "text-white/40")}>
                {STATUS_META[step]?.label ?? step}
                {active ? <span className="ml-2 font-label-technical text-[9px] text-[#FF0D7B] uppercase">Current</span> : null}
              </p>
              <p className="font-body-sm text-body-sm text-white/50">{STATUS_META[step]?.description}</p>
              {stamp ? <p className="font-label-technical text-[9px] text-white/40 mt-1">{stamp}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ReorderHint() {
  return (
    <span className="inline-flex items-center gap-1 font-body-sm text-body-sm text-white/50">
      <RotateCcw className="size-3.5" /> Reorder adds the same designs back to your cart.
    </span>
  );
}

export { Package };
