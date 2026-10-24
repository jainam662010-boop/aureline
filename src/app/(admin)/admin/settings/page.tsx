import type { Metadata } from "next";
import { getSettings } from "@/lib/commerce";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const settings = await getSettings();

  const [placements, tiers] = await Promise.all([
    prisma.printPlacement.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }),
    prisma.quantityDiscount.findMany({ orderBy: { minQty: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-space-lg">
      <header>
        <span className="label-tech">Pricing engine inputs</span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Settings</h1>
        <p className="font-body-md text-body-md text-white/55 mt-space-xs max-w-2xl">
          These values feed the pricing engine directly: base price + print placement + quantity tier − coupon + shipping
          + GST. Edits take effect on the next request.
        </p>
      </header>

      <SettingsForm settings={settings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <section className="glass-panel p-space-md">
          <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm">Print placements</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {["Key", "Label", "Side", "Size", "Base"].map((head) => (
                    <th key={head} className="py-2 pr-space-sm font-label-technical text-[9px] uppercase tracking-widest text-white/40">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr key={placement.id} className="border-b border-white/[0.05]">
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-white/70">{placement.key}</td>
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-white/70">{placement.label}</td>
                    <td className="py-2 pr-space-sm font-label-technical text-[9px] uppercase tracking-widest text-white/45">
                      {placement.side}
                    </td>
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-white/55 tabular-nums">
                      {Number(placement.widthIn)}″ × {Number(placement.heightIn)}″
                    </td>
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-[#7ef0a8] tabular-nums">
                      ₹{Number(placement.baseCost)}
                    </td>
                  </tr>
                ))}
                {placements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center font-body-sm text-body-sm text-white/40">
                      No placements — run the seed script.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel p-space-md">
          <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm">Quantity tiers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {["Range", "Discount", "Applied to"].map((head) => (
                    <th key={head} className="py-2 pr-space-sm font-label-technical text-[9px] uppercase tracking-widest text-white/40">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-white/[0.05]">
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-white/70 tabular-nums">
                      {tier.minQty}
                      {tier.maxQty !== null ? ` – ${tier.maxQty}` : "+"}
                    </td>
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-[#7ef0a8] tabular-nums">
                      −{Number(tier.percentOff)}%
                    </td>
                    <td className="py-2 pr-space-sm font-body-sm text-body-sm text-white/55">
                      Print charges
                    </td>
                  </tr>
                ))}
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-5 text-center font-body-sm text-body-sm text-white/40">
                      No tiers — run the seed script.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
