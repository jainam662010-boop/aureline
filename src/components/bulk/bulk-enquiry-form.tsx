"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitBulkEnquiry } from "@/actions/bulk";
import { cn, bytesToMb } from "@/lib/utils";

const bulkSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  company: z.string().max(120).optional().or(z.literal("")),
  productName: z.string().max(120).optional().or(z.literal("")),
  quantity: z.coerce
    .number({ message: "Enter a quantity." })
    .int("Whole pieces only.")
    .min(10, "Bulk pricing starts at 10 pieces.")
    .max(100000),
  deadline: z.string().optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof bulkSchema>;

const TIERS = [
  { from: 10, to: 49, pct: 0 },
  { from: 50, to: 99, pct: 8 },
  { from: 100, to: 299, pct: 14 },
  { from: 300, to: 499, pct: 19 },
  { from: 500, to: null, pct: 25 },
];

function discountPct(qty: number): number {
  const tier = [...TIERS].reverse().find((t) => qty >= t.from && (t.to === null || qty <= (t.to as number)));
  return tier?.pct ?? 0;
}

export function BulkEnquiryForm({ isLoggedIn, userName }: { isLoggedIn: boolean; userName?: string | null }) {
  const router = useRouter();
  const [artwork, setArtwork] = React.useState<File | null>(null);
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      name: userName ?? "",
      email: "",
      phone: "",
      company: "",
      productName: "",
      quantity: 50,
      deadline: "",
      message: "",
    },
  });

  const quantity = watch("quantity");
  const pct = discountPct(Number(quantity) || 0);

  const onSubmit = async (values: FormValues) => {
    const result = await submitBulkEnquiry(
      {
        ...values,
        company: values.company || null,
        productName: values.productName || null,
        deadline: values.deadline || null,
        message: values.message || null,
        productIds: [],
      },
      artwork,
    );

    if (result.ok) {
      setSubmitted(result.data.reference);
      toast.success("Enquiry received — we'll respond within 12 working hours.");
    } else {
      toast.error(result.error);
      if (result.fields) {
        Object.entries(result.fields).forEach(([field, messages]) => toast.error(`${field}: ${messages[0]}`));
      }
    }
  };

  if (submitted) {
    return (
      <div className="glass-panel p-space-lg text-center flex flex-col items-center gap-space-sm">
        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#22c55e]/30 to-[#0891B2]/30 border border-[#22c55e]/50 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-[#047857]" />
        </span>
        <h3 className="font-headline-md text-headline-md font-bold text-slate-900">Enquiry received</h3>
        <p className="font-headline-lg text-headline-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9]">
          {submitted}
        </p>
        <p className="font-body-md text-body-md text-slate-600 max-w-md">
          Our bulk team will email you a firm quote — including any volume slabs, artwork fixes and delivery windows —
          within 12 working hours.
        </p>
        <Button variant="glass" size="md" onClick={() => router.push("/products")} className="mt-space-xs">
          Keep browsing blanks <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-space-md flex flex-col gap-space-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        <Field label="Your name" error={errors.name?.message}>
          <Input placeholder="Priya Sharma" {...register("name")} />
        </Field>
        <Field label="Work email" error={errors.email?.message}>
          <Input type="email" placeholder="you@company.com" {...register("email")} />
        </Field>
        <Field label="Mobile" error={errors.phone?.message}>
          <Input inputMode="numeric" placeholder="9876543210" {...register("phone")} />
        </Field>
        <Field label="Company / college (optional)" error={errors.company?.message}>
          <Input placeholder="Acme Studios" {...register("company")} />
        </Field>
        <Field label="Product of interest" error={errors.productName?.message}>
          <Input placeholder="Heavyweight tees" {...register("productName")} />
        </Field>
        <Field label="Quantity (min 10)" error={errors.quantity?.message}>
          <Input type="number" min={10} inputMode="numeric" {...register("quantity")} />
        </Field>
        <Field label="Needed by (optional)" error={errors.deadline?.message}>
          <Input type="date" {...register("deadline")} />
        </Field>
        <Field label="Upload artwork (optional)">
          <label className="flex items-center gap-space-xs h-11 px-space-sm rounded-2xl border border-slate-900/[0.1] bg-slate-900/[0.04] cursor-pointer hover:border-slate-900/[0.1] transition-all">
            <Upload className="size-4 text-slate-600" />
            <span className="font-body-sm text-body-sm text-slate-600 truncate">
              {artwork ? `${artwork.name} · ${bytesToMb(artwork.size)} MB` : "PNG, SVG or PDF up to 10 MB"}
            </span>
            <input
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
              onChange={(e) => setArtwork(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
      </div>

      <Field label="Project details" error={errors.message?.message}>
        <Textarea
          rows={4}
          placeholder="Sizes mix, colourways, print locations, deadline pressure — anything that helps us quote precisely."
          {...register("message")}
        />
      </Field>

      {/* Live discount calculator */}
      <div className="rounded-2xl border border-slate-900/[0.08] bg-slate-900/[0.03] p-space-sm">
        <div className="flex items-center justify-between mb-space-xs">
          <span className="label-tech mb-0">Live volume estimate</span>
          <span className="font-label-lg text-label-lg text-slate-900 tabular-nums">
            {Number(quantity) > 0 ? `${Number(quantity)} pcs` : "—"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-space-xs">
          {TIERS.map((tier) => {
            const active = Number(quantity) >= tier.from && (tier.to === null || Number(quantity) <= (tier.to as number));
            return (
              <span
                key={tier.from}
                className={cn(
                  "px-3 py-1 rounded-full font-label-technical text-[10px] uppercase tracking-widest border transition-all",
                  active
                    ? "border-[#0EA5E9]/60 bg-[#0EA5E9]/15 text-[#0284C7]"
                    : "border-slate-900/[0.1] bg-slate-900/[0.03] text-slate-500",
                )}
              >
                {tier.from}
                {tier.to ? `–${tier.to}` : "+"} · −{tier.pct}%
              </span>
            );
          })}
        </div>
        <p className="font-body-sm text-body-sm text-slate-600">
          {pct > 0 ? (
            <>
              You qualify for <b className="text-[#047857]">−{pct}%</b> off print charges
              {quantity >= 500 ? " plus free standard shipping across India." : "."}
            </>
          ) : (
            <>Add 10+ pieces to unlock volume pricing. 500+ gets the deepest slab and free shipping.</>
          )}
        </p>
      </div>

      <Button type="submit" size="lg" className="h-13" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Sending…" : "Request a firm quote"}
      </Button>

      {!isLoggedIn ? (
        <p className="font-body-sm text-body-sm text-slate-500 text-center">
          No account needed — we&apos;ll reply by email within 12 working hours.
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <Label>{label}</Label>
      {children}
      {error ? <span className="font-body-sm text-body-sm text-[#BE123C]">{error}</span> : null}
    </div>
  );
}
