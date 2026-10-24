import type { Metadata } from "next";
import { TrackForm } from "@/components/orders/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Look up any Aureline Atelier order by order number or email — live artwork review, production and delivery status.",
};

export const dynamic = "force-dynamic";

export default function TrackPage() {
  return (
    <div className="max-w-4xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-lg text-center">
        <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
          No login required
        </span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Track your order</h1>
        <p className="font-body-md text-body-md text-white/60 mt-space-xs max-w-lg mx-auto">
          Enter your order number (from your confirmation email) or the email you checked out with. Every stage — from
          artwork review to delivery — updates live.
        </p>
      </div>

      <TrackForm />

      <div className="mt-space-xl grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
        {[
          { label: "Artwork review", body: "A human checks resolution, placement and colour before anything prints." },
          { label: "Production", body: "DTF printed, powder cured and heat-pressed — usually 2–3 working days." },
          { label: "Dispatch", body: "QC, packed and handed to our courier partner with tracking by WhatsApp/email." },
        ].map((stage) => (
          <div key={stage.label} className="glass-panel-sm p-space-md">
            <span className="label-tech">{stage.label}</span>
            <p className="font-body-sm text-body-sm text-white/55 mt-1">{stage.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
