import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BulkEnquiryForm } from "@/components/bulk/bulk-enquiry-form";
import { formatINR } from "@/lib/utils";
import { Boxes, Palette, Truck, ShieldCheck, Timer, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Bulk & Corporate Orders",
  description:
    "Volume pricing for teams, colleges, events and merch drops — 10 pieces minimum with firm quotes in 12 working hours.",
};

export const dynamic = "force-dynamic";

const PERKS = [
  {
    icon: Boxes,
    title: "10 piece minimum",
    body: "No MOQ theatre. Sample a single design at 10 pieces, then scale the exact same artwork.",
    tint: "from-[#FF3B30] to-[#FF0D7B]",
  },
  {
    icon: Palette,
    title: "Free artwork fixes",
    body: "Our studio preflights every file — resolution, transparency, colour space — at no extra cost.",
    tint: "from-[#FF0D7B] to-[#8026F2]",
  },
  {    icon: Truck,
    title: "Dispatch in 5–7 days",
    body: "Express air available for launches and event deadlines. Pan-India courier with tracking.",
    tint: "from-[#8026F2] to-[#00E0F2]",
  },
  {
    icon: ShieldCheck,
    title: "Bulk quality guarantee",
    body: "Any print defect in a bulk run is re-printed free — we inspect every piece before packing.",
    tint: "from-[#00E0F2] to-[#22c55e]",
  },
];

const USE_CASES = [
  { icon: Users, label: "Startup offsites & team merch" },
  { icon: Timer, label: "College fests and societies" },
  { icon: Palette, label: "DTC brands testing small drops" },
  { icon: Boxes, label: "Creator merchandise launches" },
  { icon: Truck, label: "Event & conference giveaways" },
  { icon: ShieldCheck, label: "Uniforms for studios and cafés" },
];

const SLABS = [
  { qty: "10 – 49", print: "Base rate", ship: "₹99 flat" },
  { qty: "50 – 99", print: "−8%", ship: "₹99 flat" },
  { qty: "100 – 299", print: "−14%", ship: "Free above ₹1,499" },
  { qty: "300 – 499", print: "−19%", ship: "Free" },
  { qty: "500 +", print: "−25%", ship: "Free + priority slot" },
];

export default async function BulkOrdersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center mb-space-2xl">
        <div className="lg:col-span-7">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
            Volume printing · 10 pieces and up
          </span>
          <h1 className="font-display font-bold text-white tracking-tight text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.05]">
            Bulk orders,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] via-[#FF0D7B] to-[#8026F2]">
              priced honestly.
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-white/65 mt-space-md max-w-xl">
            Teams, colleges, events and merch drops get the same DTF quality as single pieces — with transparent volume
            slabs, free artwork preflight and a firm quote in 12 working hours.
          </p>

          <div className="flex flex-wrap gap-space-sm mt-space-lg">
            <a href="#enquiry" className="btn-gradient px-space-lg py-space-sm">
              Request a quote
            </a>
            <Link href="/products" className="glass-panel px-space-lg py-space-sm font-label-lg text-label-lg text-white hover:border-white/30 transition-all">
              Browse blanks
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="glass-panel p-space-md">
            <span className="label-tech">Volume slab calculator</span>
            <table className="w-full font-body-md text-body-md">
              <thead>
                <tr className="text-white/45 font-label-technical text-[9px] uppercase tracking-widest">
                  <th className="text-left pb-space-xs">Quantity</th>
                  <th className="text-left pb-space-xs">Print rate</th>
                  <th className="text-right pb-space-xs">Shipping</th>
                </tr>
              </thead>
              <tbody>
                {SLABS.map((slab) => (
                  <tr key={slab.qty} className="border-t border-white/[0.06]">
                    <td className="py-2 text-white tabular-nums">{slab.qty}</td>
                    <td className={`py-2 ${slab.print === "Base rate" ? "text-white/70" : "text-[#7ef0a8]"}`}>{slab.print}</td>
                    <td className="py-2 text-right text-white/70">{slab.ship}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-body-sm text-body-sm text-white/45 mt-space-sm">
              Slabs apply to print charges. Blanks keep their listed price; GST is added at checkout. Example: 120
              custom tees land around {formatINR(319 * 120 * 0.86)} before GST.
            </p>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-2xl">
        {PERKS.map((perk) => (
          <article key={perk.title} className="glass-panel p-space-md hover:border-white/25 transition-all group">
            <span
              className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${perk.tint} flex items-center justify-center mb-space-sm group-hover:scale-110 transition-transform`}
            >
              <perk.icon className="size-5 text-white" />
            </span>
            <h3 className="font-label-lg text-label-lg text-white mb-1">{perk.title}</h3>
            <p className="font-body-sm text-body-sm text-white/55">{perk.body}</p>
          </article>
        ))}
      </section>

      {/* Use cases */}
      <section className="mb-space-2xl">
        <span className="label-tech">Who we print for</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.label}
              className="flex items-center gap-space-sm glass-panel-sm p-space-sm hover:border-[#FF0D7B]/50 transition-all"
            >
              <span className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF6BC0] flex-shrink-0">
                <useCase.icon className="size-4" />
              </span>
              <span className="font-label-md text-label-md text-white/85">{useCase.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="enquiry" className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg scroll-mt-24">
        <div className="lg:col-span-5">
          <span className="label-tech">Firm quote in 12 working hours</span>
          <h2 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight mb-space-sm">
            Tell us what you need
          </h2>
          <p className="font-body-md text-body-md text-white/60 mb-space-md">
            Share quantities, sizes and your artwork. We reply with a fixed per-piece price, artwork preflight notes and
            a realistic dispatch date — no back-and-forth.
          </p>

          <ol className="flex flex-col gap-space-sm">
            {[
              "You send quantities, sizes and artwork (or pick from our clipart library).",
              "We preflight the file, suggest fixes and send a firm per-piece quote.",
              "Approve the digital proof — nothing prints before you sign off.",
              "Production, QC, packed and dispatched with live tracking on your order page.",
            ].map((step, index) => (
              <li key={step} className="flex gap-space-sm">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF3B30] to-[#FF0D7B] flex items-center justify-center font-label-technical text-[10px] text-white flex-shrink-0">
                  {index + 1}
                </span>
                <span className="font-body-md text-body-md text-white/65 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <BulkEnquiryForm isLoggedIn={Boolean(session?.user?.id)} userName={session?.user?.name} />
        </div>
      </section>
    </div>
  );
}
