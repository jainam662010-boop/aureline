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
            <tr className="border-b border-white/[0.08]">
              {["Product", "Category", "Base price", "Sold", "Status", "Flags"].map((head) => (
                <th key={head} className="px-space-md py-3 font-label-technical text-[9px] uppercase tracking-widest text-white/40">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <React.Fragment key={product.id}>
                <tr className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                  <td className="px-space-md py-3">
                    <button
                      type="button"
                      onClick={() => setExpanded((id) => (id === product.id ? null : product.id))}
                      className="flex items-center gap-2 text-left group"
                      aria-expanded={expanded === product.id}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 text-white/40 transition-transform",
                          expanded === product.id && "rotate-180 text-[#FF0D7B]",
                        )}
                      />
                      <span>
                        <span className="font-label-lg text-label-lg text-white group-hover:text-[#FF6BC0] transition-colors block">
                          {product.name}
                        </span>
                        <span className="font-body-sm text-body-sm text-white/40">{product.slug}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-white/60">{product.categoryName}</td>
                  <td className="px-space-md py-3">
                    <PriceEditor product={product} />
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-white/55 tabular-nums">{product.unitsSold}</td>
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
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <td colSpan={6} className="px-space-md py-space-sm">
                      <div className="flex items-center justify-between mb-space-xs">
                        <span className="label-tech">Inventory · {product.variants.length} variants</span>
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-label-md text-label-md text-[#00E0F2] hover:underline"
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
                <td colSpan={6} className="px-space-md py-10 text-center font-body-sm text-body-sm text-white/40">
                  No products — run <code className="text-[#00E0F2]">npm run db:seed</code> to load the catalog.
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
      <span className="font-body-sm text-body-sm text-white/45">₹</span>
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label={`Base price for ${product.name}`}
        inputMode="decimal"
        className="w-20 h-9 px-2 rounded-xl bg-white/[0.05] border border-white/10 font-label-md text-label-md text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
      />
      {busy ? <Loader2 className="size-3.5 text-white/50 animate-spin" /> : null}
      {product.basePrice >= 999 ? (
        <span className="font-label-technical text-[8px] uppercase tracking-widest text-white/30">incl. print</span>
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
      ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#7ef0a8]"
      : status === "DRAFT"
        ? "border-[#FF8C26]/40 bg-[#FF8C26]/10 text-[#FFC084]"
        : "border-white/15 bg-white/[0.05] text-white/55";

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        disabled={busy}
        onChange={(e) => change(e.target.value as AdminProduct["status"])}
        aria-label={`Status for ${product.name}`}
        className={cn(
          "appearance-none h-8 pl-3 pr-7 rounded-full border font-label-technical text-[9px] uppercase tracking-widest bg-transparent focus:outline-none focus:ring-2 focus:ring-[#FF3B30]",
          tone,
        )}
      >
        {(["ACTIVE", "DRAFT", "ARCHIVED"] as const).map((value) => (
          <option key={value} value={value} className="bg-[#101014] text-white">
            {value}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 size-3 pointer-events-none opacity-60" />
      {busy ? <Loader2 className="ml-1.5 size-3 text-white/50 animate-spin" /> : null}
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
          ? "border-[#FF0D7B]/50 bg-[#FF0D7B]/15 text-[#FF6BC0]"
          : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:border-white/25",
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
        stock === 0 ? "border-[#ff5545]/40 bg-[#93000a]/20" : stock <= 5 ? "border-[#FF8C26]/40 bg-[#FF8C26]/10" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <span className="font-body-sm text-body-sm text-white/70 whitespace-nowrap">
        {variant.colorName} {variant.size}
      </span>
      <button
        type="button"
        aria-label={`Decrease stock for ${variant.colorName} ${variant.size}`}
        onClick={() => apply(stock - 1)}
        disabled={busy || stock === 0}
        className="w-5 h-5 rounded-full bg-white/[0.08] text-white/70 text-xs leading-none hover:bg-white/[0.16] disabled:opacity-40"
      >
        −
      </button>
      <span className="font-label-md text-label-md text-white tabular-nums w-7 text-center">{stock}</span>
      <button
        type="button"
        aria-label={`Increase stock for ${variant.colorName} ${variant.size}`}
        onClick={() => apply(stock + 1)}
        disabled={busy}
        className="w-5 h-5 rounded-full bg-white/[0.08] text-white/70 text-xs leading-none hover:bg-white/[0.16] disabled:opacity-40"
      >
        +
      </button>
      {busy ? <Loader2 className="size-3 text-white/50 animate-spin" /> : null}
    </div>
  );
}
