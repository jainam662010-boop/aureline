"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ChevronDown, Star, Sparkles } from "lucide-react";
import { adminUpdateProduct, adminUpdateVariantStock } from "@/actions/admin";
import { cn, formatINR } from "@/lib/utils";

interface AdminVariant {
  id: string;
  size: string;
  colorName: string;
  stock: number;
  priceDelta: number;
}

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  basePrice: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isBestseller: boolean;
  isNewArrival: boolean;
  unitsSold: number;
  variants: AdminVariant[];
}

export function ProductsTable({ products }: { products: AdminProduct[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-900/[0.08]">
              {["Product", "Category", "Base price", "Sold", "Status", "Flags"].map((head) => (
                <th key={head} className="px-space-md py-3 font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <React.Fragment key={product.id}>
                <tr className="border-b border-slate-900/[0.05] hover:bg-slate-900/[0.03] transition-colors">
                  <td className="px-space-md py-3">
                    <button
                      type="button"
                      onClick={() => setExpanded((id) => (id === product.id ? null : product.id))}
                      className="flex items-center gap-2 text-left group"
                      aria-expanded={expanded === product.id}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 text-slate-500 transition-transform",
                          expanded === product.id && "rotate-180 text-[#0EA5E9]",
                        )}
                      />
                      <span>
                        <span className="font-label-lg text-label-lg text-slate-900 group-hover:text-[#0284C7] transition-colors block">
                          {product.name}
                        </span>
                        <span className="font-body-sm text-body-sm text-slate-500">{product.slug}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600">{product.categoryName}</td>
                  <td className="px-space-md py-3">
                    <PriceEditor product={product} />
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600 tabular-nums">{product.unitsSold}</td>
                  <td className="px-space-md py-3">
                    <StatusSelect product={product} />
                  </td>
                  <td className="px-space-md py-3">
                    <div className="flex gap-1.5">
                      <FlagToggle
                        active={product.isBestseller}
                        label="Bestseller"
                        icon={<Star className="size-3" />}
                        onToggle={async (next) => {
                          const result = await adminUpdateProduct({ productId: product.id, isBestseller: next });
                          if (!result.ok) toast.error(result.error);
                          return result.ok;
                        }}
                      />
                      <FlagToggle
                        active={product.isNewArrival}
                        label="New"
                        icon={<Sparkles className="size-3" />}
                        onToggle={async (next) => {
                          const result = await adminUpdateProduct({ productId: product.id, isNewArrival: next });
                          if (!result.ok) toast.error(result.error);
                          return result.ok;
                        }}
                      />
                    </div>
                  </td>
                </tr>

                {expanded === product.id ? (
                  <tr className="border-b border-slate-900/[0.05] bg-slate-900/[0.02]">
                    <td colSpan={6} className="px-space-md py-space-sm">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="label-tech">Inventory · {product.variants.length} variants</span>
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-label-md text-label-md text-[#0891B2] hover:underline"
                        >
                          View in store →
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {product.variants.map((variant) => (
                          <StockStepper
                            key={variant.id}
                            variant={variant}
                            onChange={async (stock) => {
                              const result = await adminUpdateVariantStock({ variantId: variant.id, stock });
                              if (!result.ok) toast.error(result.error);
                              return result.ok;
                            }}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-space-md py-10 text-center font-body-sm text-body-sm text-slate-500">
                  No products — run <code className="text-[#0891B2]">npm run db:seed</code> to load the catalog.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceEditor({ product }: { product: AdminProduct }) {
  const [price, setPrice] = React.useState(String(product.basePrice));
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid price.");
      return;
    }
    if (value === product.basePrice) return;
    setBusy(true);
    const result = await adminUpdateProduct({ productId: product.id, basePrice: value });
    setBusy(false);
    if (result.ok) toast.success(`${product.name} price updated.`);
    else toast.error(result.error);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-body-sm text-body-sm text-slate-500">₹</span>
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label={`Base price for ${product.name}`}
        inputMode="decimal"
        className="w-20 h-9 px-2 rounded-xl bg-slate-900/[0.05] border border-slate-900/[0.1] font-label-md text-label-md text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
      />
      {busy ? <Loader2 className="size-3.5 text-slate-500 animate-spin" /> : null}
      {product.basePrice >= 999 ? (
        <span className="font-label-technical text-[8px] uppercase tracking-widest text-slate-400">incl. print</span>
      ) : null}
      <span className="sr-only">{formatINR(product.basePrice)}</span>
    </div>
  );
}

function StatusSelect({ product }: { product: AdminProduct }) {
  const [status, setStatus] = React.useState(product.status);
  const [busy, setBusy] = React.useState(false);

  const change = async (next: AdminProduct["status"]) => {
    setBusy(true);
    const result = await adminUpdateProduct({ productId: product.id, status: next });
    setBusy(false);
    if (result.ok) {
      setStatus(next);
      toast.success(`${product.name} → ${next.toLowerCase()}`);
    } else {
      toast.error(result.error);
    }
  };

  const tone =
    status === "ACTIVE"
      ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#047857]"
      : status === "DRAFT"
        ? "border-[#D97706]/40 bg-[#D97706]/10 text-[#B45309]"
        : "border-slate-900/[0.1] bg-slate-900/[0.05] text-slate-600";

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        disabled={busy}
        onChange={(e) => change(e.target.value as AdminProduct["status"])}
        aria-label={`Status for ${product.name}`}
        className={cn(
          "appearance-none h-8 pl-3 pr-7 rounded-full border font-label-technical text-[9px] uppercase tracking-widest bg-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]",
          tone,
        )}
      >
        {(["ACTIVE", "DRAFT", "ARCHIVED"] as const).map((value) => (
          <option key={value} value={value} className="bg-[#FFFFFF] text-slate-900">
            {value}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 size-3 pointer-events-none opacity-60" />
      {busy ? <Loader2 className="ml-1.5 size-3 text-slate-500 animate-spin" /> : null}
    </div>
  );
}

function FlagToggle({
  active,
  label,
  icon,
  onToggle,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onToggle: (next: boolean) => Promise<boolean>;
}) {
  const [state, setState] = React.useState(active);
  const [busy, setBusy] = React.useState(false);

  const click = async () => {
    setBusy(true);
    const success = await onToggle(!state);
    setBusy(false);
    if (success) setState(!state);
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={state}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full border font-label-technical text-[9px] uppercase tracking-widest transition-all",
        state
          ? "border-[#0EA5E9]/50 bg-[#0EA5E9]/15 text-[#0284C7]"
          : "border-slate-900/[0.1] bg-slate-900/[0.03] text-slate-500 hover:text-slate-900 hover:border-slate-900/[0.1]",
        busy && "opacity-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StockStepper({
  variant,
  onChange,
}: {
  variant: AdminVariant;
  onChange: (stock: number) => Promise<boolean>;
}) {
  const [stock, setStock] = React.useState(variant.stock);
  const [busy, setBusy] = React.useState(false);

  const apply = async (next: number) => {
    const clamped = Math.max(0, Math.min(99999, next));
    setBusy(true);
    const success = await onChange(clamped);
    setBusy(false);
    if (success) setStock(clamped);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 h-8",
        stock === 0 ? "border-[#F43F5E]/40 bg-[#E11D48]/20" : stock <= 5 ? "border-[#D97706]/40 bg-[#D97706]/10" : "border-slate-900/[0.1] bg-slate-900/[0.03]",
      )}
    >
      <span className="font-body-sm text-body-sm text-slate-700 whitespace-nowrap">
        {variant.colorName} {variant.size}
      </span>
      <button
        type="button"
        aria-label={`Decrease stock for ${variant.colorName} ${variant.size}`}
        onClick={() => apply(stock - 1)}
        disabled={busy || stock === 0}
        className="w-5 h-5 rounded-full bg-slate-900/[0.06] text-slate-700 text-xs leading-none hover:bg-slate-900/[0.1] disabled:opacity-40"
      >
        −
      </button>
      <span className="font-label-md text-label-md text-slate-900 tabular-nums w-7 text-center">{stock}</span>
      <button
        type="button"
        aria-label={`Increase stock for ${variant.colorName} ${variant.size}`}
        onClick={() => apply(stock + 1)}
        disabled={busy}
        className="w-5 h-5 rounded-full bg-slate-900/[0.06] text-slate-700 text-xs leading-none hover:bg-slate-900/[0.1] disabled:opacity-40"
      >
        +
      </button>
      {busy ? <Loader2 className="size-3 text-slate-500 animate-spin" /> : null}
    </div>
  );
}
