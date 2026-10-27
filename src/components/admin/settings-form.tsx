"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSaveSettings } from "@/actions/admin";

interface SiteSettings {
  defaultGstRate: number;
  defaultShippingFee: number;
  freeShippingThreshold: number;
  printRatePerSqIn: number;
  printMinimum: number;
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [form, setForm] = React.useState({
    defaultGstRate: String(settings.defaultGstRate),
    defaultShippingFee: String(settings.defaultShippingFee),
    freeShippingThreshold: String(settings.freeShippingThreshold),
    printRatePerSqIn: String(settings.printRatePerSqIn),
    printMinimum: String(settings.printMinimum),
  });
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await adminSaveSettings({
      defaultGstRate: Number(form.defaultGstRate),
      defaultShippingFee: Number(form.defaultShippingFee),
      freeShippingThreshold: Number(form.freeShippingThreshold),
      printRatePerSqIn: Number(form.printRatePerSqIn),
      printMinimum: Number(form.printMinimum),
    });
    setBusy(false);
    if (result.ok) toast.success("Settings saved — pricing engine cache invalidated.");
    else toast.error(result.error);
  };

  const field = (
    key: keyof typeof form,
    label: string,
    hint: string,
    suffix: string,
    step = "1",
  ) => (
    <div className="flex flex-col gap-space-xs">
      <Label htmlFor={`setting-${key}`}>{label}</Label>
      <div className="relative">
        <Input
          id={`setting-${key}`}
          type="number"
          min={0}
          step={step}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="pr-10"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-technical text-[9px] uppercase tracking-widest text-slate-500 pointer-events-none">
          {suffix}
        </span>
      </div>
      <p className="font-body-sm text-body-sm text-slate-500">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="glass-panel p-space-md">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        {field("defaultGstRate", "Default GST rate", "Applied to taxable orders unless a product overrides it.", "%", "0.5")}
        {field("defaultShippingFee", "Standard shipping fee", "Charged when the order is under the free threshold.", "₹")}
        {field("freeShippingThreshold", "Free shipping threshold", "Orders at or above this subtotal ship free.", "₹")}
      </div>

      <div className="mt-space-md pt-space-md border-t border-slate-900/[0.06]">
        <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500 mb-space-sm">
          Per-square-inch print pricing
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
          {field(
            "printRatePerSqIn",
            "Print rate",
            "Charged per square inch of the design's bounding box. Set 0 to go back to flat placement fees.",
            "₹/in²",
            "0.05",
          )}
          {field("printMinimum", "Minimum print charge", "Floor for a single print, however small the artwork.", "₹")}
        </div>
        <p className="font-body-sm text-body-sm text-slate-500 mt-space-sm">
          Studio lines are priced on the actual artwork area, clipped to the placement. Catalogue quick-adds with no
          design keep the placement&apos;s flat fee.
        </p>
      </div>

      <div className="flex justify-end mt-space-md">
        <Button type="submit" size="md" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
