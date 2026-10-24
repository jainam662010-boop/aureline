"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Minus, Plus, ShoppingCart, Brush, Truck, RotateCcw, ShieldCheck, ChevronDown, Printer } from "lucide-react";
import { GarmentMockup, garmentTypeFromCategory, type GarmentType } from "@/components/shared/garment-mockup";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/actions/cart";
import { cn, formatINR } from "@/lib/utils";
import { resolvePrintCost } from "@/lib/print-area";

export interface SerializedVariant {
  id: string;
  size: string;
  colorName: string;
  colorHex: string;
  stock: number;
  priceDelta: number;
  sku: string;
}

export interface SerializedPlacement {
  key: string;
  label: string;
  side: string;
  widthIn: number;
  heightIn: number;
  baseCost: number;
  surcharge: number;
}

export interface SerializedProductDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  fabric: string;
  gsm: number;
  fit: string | null;
  careInstructions: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  gstRate: number;
  weightGrams: number | null;
  isBestseller: boolean;
  isNewArrival: boolean;
  category: { name: string; slug: string };
  images: { id: string; url: string; alt: string | null; side: string | null; colorHex: string | null }[];
  variants: SerializedVariant[];
  placements: SerializedPlacement[];
  printPricing: { ratePerSqIn: number; minimum: number };
}

export function ProductDetailClient({ product }: { product: SerializedProductDetail }) {
  const router = useRouter();
  const garmentType = (garmentTypeFromCategory(product.category.slug) ?? "tee") as GarmentType;

  const colors = React.useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    product.variants.forEach((v) => {
      if (!map.has(v.colorHex)) map.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
    });
    return [...map.values()];
  }, [product.variants]);

  const [colorHex, setColorHex] = React.useState(colors[0]?.hex ?? "#111111");
  const activeColor = colors.find((c) => c.hex === colorHex) ?? colors[0];

  const sizes = React.useMemo(
    () => product.variants.filter((v) => v.colorHex === colorHex),
    [product.variants, colorHex],
  );

  const [size, setSize] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(0);
  const [openAccordion, setOpenAccordion] = React.useState<string | null>("details");

  // Keep a valid size selected when colour changes.
  React.useEffect(() => {
    const inStock = sizes.filter((v) => v.stock > 0);
    if (!sizes.some((v) => v.size === size)) {
      setSize(inStock.find((v) => v.size === "M")?.size ?? inStock[0]?.size ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHex]);

  const selectedVariant = sizes.find((v) => v.size === size) ?? null;
  const defaultPlacement = product.placements[0] ?? null;
  const priceDelta = selectedVariant?.priceDelta ?? 0;
  const printCost = defaultPlacement
    ? resolvePrintCost({
        baseCost: defaultPlacement.baseCost,
        surcharge: defaultPlacement.surcharge,
        areaSqIn: defaultPlacement.widthIn * defaultPlacement.heightIn,
        pricing: product.printPricing,
      })
    : 0;
  const unitPrice = product.basePrice + priceDelta + printCost;

  const image = product.images[activeImage] ?? null;

  const handleAdd = async () => {
    if (!selectedVariant) {
      toast.error("Choose a size first.");
      return;
    }
    setAdding(true);
    try {
      const result = await addToCart({
        productId: product.id,
        variantId: selectedVariant.id,
        placementKey: defaultPlacement?.key ?? "",
        side: defaultPlacement?.side === "BACK" ? "BACK" : "FRONT",
        quantity,
      });
      if (result.ok) {
        toast.success(`${product.name} added to cart`, {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      } else {
        toast.error(result.error);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDesign = () => {
    router.push(`/design/${product.id}`);
  };

  const accInfo = [
    {
      id: "details",
      title: "Blank details",
      body: (
        <div className="flex flex-col gap-space-xs font-body-sm text-body-sm text-white/60">
          <p>{product.description}</p>
          <ul className="flex flex-col gap-1 mt-space-xs">
            <li>Fabric: {product.fabric} · {product.gsm} GSM</li>
            {product.fit ? <li>Fit: {product.fit}</li> : null}
            {product.weightGrams ? <li>Weight: {product.weightGrams} g</li> : null}
            <li>Print: DTF, wash-tested to 60 cycles</li>
          </ul>
        </div>
      ),
    },
    {
      id: "printing",
      title: "Printing & turnaround",
      body: (
        <p className="font-body-sm text-body-sm text-white/60">
          Your design is reviewed by our print team within 12 hours, then produced in 2–3 working days. Standard
          shipping takes 5–7 days; express air lands in 2–3. Every order ships with tracking on your orders page.
        </p>
      ),
    },
    {
      id: "care",
      title: "Care instructions",
      body: (
        <p className="font-body-sm text-body-sm text-white/60">
          {product.careInstructions ??
            "Machine wash cold, inside out, with like colours. Do not iron directly on the print. Tumble dry low."}
        </p>
      ),
    },
    {
      id: "returns",
      title: "Returns & guarantees",
      body: (
        <p className="font-body-sm text-body-sm text-white/60">
          Custom-printed items can&apos;t be returned for change of mind, but any print defect is re-printed free.
          Unused plain blanks can be returned within 7 days. Wrong size? One free size exchange per order.
        </p>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl">
      {/* Gallery */}
      <div className="flex flex-col gap-space-sm">
        <div className="glass-panel p-space-md">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              className="w-full h-[420px] object-cover rounded-2xl"
              draggable={false}
            />
          ) : (
            <div className="h-[420px] flex items-center justify-center rounded-2xl bg-white/[0.02]">
              <GarmentMockup type={garmentType} color={activeColor?.hex ?? "#111111"} className="h-full w-auto" glow />
            </div>
          )}
        </div>

        {product.images.length > 1 ? (
          <div className="flex gap-space-xs overflow-x-auto hide-scrollbar">
            {product.images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={activeImage === index}
                className={cn(
                  "w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all",
                  activeImage === index ? "border-[#FF0D7B]" : "border-white/10 hover:border-white/30",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Buy box */}
      <div className="flex flex-col gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs flex-wrap mb-space-xs">
            {product.isBestseller ? (
              <span className="rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] px-3 py-1 font-label-technical text-[9px] uppercase tracking-wider text-white">
                Bestseller
              </span>
            ) : null}
            {product.isNewArrival ? (
              <span className="rounded-full bg-[#00E0F2]/90 px-3 py-1 font-label-technical text-[9px] uppercase tracking-wider text-black">
                New arrival
              </span>
            ) : null}
            <Link
              href={`/products?category=${product.category.slug}`}
              className="font-label-technical text-[9px] uppercase tracking-widest text-white/45 hover:text-white transition-colors"
            >
              {product.category.name}
            </Link>
          </div>

          <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-white">{product.name}</h1>
          {product.tagline ? <p className="font-body-md text-body-md text-white/55 mt-space-xs">{product.tagline}</p> : null}

          <div className="flex items-baseline gap-space-sm mt-space-sm">
            <span className="font-headline-lg text-headline-lg font-bold text-white tabular-nums">
              {formatINR(unitPrice)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > unitPrice ? (
              <span className="font-body-md text-body-md text-white/40 line-through tabular-nums">
                {formatINR(product.compareAtPrice)}
              </span>
            ) : null}
            <span className="font-label-technical text-[9px] uppercase tracking-widest text-white/40">
              incl. print · +{product.gstRate}% GST at checkout
            </span>
          </div>
        </div>

        {/* Colour */}
        <div>
          <div className="flex items-center justify-between mb-space-xs">
            <span className="label-tech mb-0">Colour · {activeColor?.name}</span>
            <span className="font-label-technical text-[9px] uppercase tracking-widest text-white/40">
              {colors.length} colourways
            </span>
          </div>
          <div className="flex flex-wrap gap-space-xs">
            {colors.map((color) => (
              <button
                key={color.hex}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={colorHex === color.hex}
                onClick={() => setColorHex(color.hex)}
                className={cn(
                  "w-9 h-9 rounded-full border-2 transition-all hover:scale-110",
                  colorHex === color.hex ? "border-[#FF3B30] ring-2 ring-[#FF3B30]/40 scale-110" : "border-white/20",
                )}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <div className="flex items-center justify-between mb-space-xs">
            <span className="label-tech mb-0">Size</span>
            <span className="font-label-technical text-[9px] uppercase tracking-widest text-white/40">Size guide</span>
          </div>
          <div className="flex flex-wrap gap-space-xs">
            {sizes.map((variant) => (
              <button
                key={variant.id}
                type="button"
                disabled={variant.stock <= 0}
                onClick={() => setSize(variant.size)}
                aria-pressed={size === variant.size}
                className={cn(
                  "min-w-12 h-11 px-3 rounded-2xl font-label-lg text-label-lg border transition-all relative",
                  size === variant.size
                    ? "bg-white/[0.14] border-white/30 text-white"
                    : "bg-white/[0.04] border-white/10 text-white/70 hover:border-white/30",
                  variant.stock <= 0 && "opacity-30 line-through cursor-not-allowed",
                )}
              >
                {variant.size}
                {variant.stock > 0 && variant.stock <= 3 ? (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-[#FF8C26]" title={`Only ${variant.stock} left`} />
                ) : null}
              </button>
            ))}
          </div>
          {selectedVariant && selectedVariant.stock > 0 ? (
            <p className="font-body-sm text-body-sm text-white/45 mt-space-xs">
              {selectedVariant.stock} in stock · ships in 2–3 working days after artwork approval
            </p>
          ) : null}
        </div>

        {/* Quantity + CTAs */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex items-center rounded-full bg-white/[0.05] border border-white/10">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-full text-white/70 hover:text-white transition-colors"
            >
              <Minus className="size-4 mx-auto" />
            </button>
            <span className="w-10 text-center font-label-lg text-label-lg text-white tabular-nums">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(500, q + 1))}
              className="w-11 h-11 rounded-full text-white/70 hover:text-white transition-colors"
            >
              <Plus className="size-4 mx-auto" />
            </button>
          </div>

          <Button size="lg" className="h-12 flex-1 min-w-44" onClick={handleAdd} disabled={adding || !selectedVariant}>
            <ShoppingCart className="size-4" /> {adding ? "Adding…" : "Add to cart"}
          </Button>

          <Button variant="glass" size="lg" className="h-12 flex-1 min-w-44" onClick={handleDesign}>
            <Brush className="size-4" /> Start designing
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-space-xs">
          {[
            { icon: Truck, label: "Free ship", hint: "above ₹1,499" },
            { icon: RotateCcw, label: "1 free swap", hint: "size exchanges" },
            { icon: ShieldCheck, label: "Print guarantee", hint: "defects re-printed" },
          ].map((perk) => (
            <div key={perk.label} className="glass-panel-sm p-space-sm text-center">
              <perk.icon className="size-4 text-[#00E0F2] mx-auto mb-1" />
              <p className="font-label-md text-label-md text-white">{perk.label}</p>
              <p className="font-body-sm text-body-sm text-white/45">{perk.hint}</p>
            </div>
          ))}
        </div>

        {/* Accordion info */}
        <div className="flex flex-col gap-space-xs">
          {accInfo.map((item) => (
            <div key={item.id} className="glass-panel-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenAccordion((current) => (current === item.id ? null : item.id))}
                aria-expanded={openAccordion === item.id}
                className="w-full flex items-center justify-between gap-space-sm px-space-md py-space-sm text-left"
              >
                <span className="font-label-lg text-label-lg text-white">{item.title}</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-white/50 transition-transform",
                    openAccordion === item.id && "rotate-180 text-[#FF0D7B]",
                  )}
                />
              </button>
              {openAccordion === item.id ? (
                <div className="px-space-md pb-space-sm border-t border-white/[0.06] pt-space-sm">{item.body}</div>
              ) : null}
            </div>
          ))}
        </div>

        {defaultPlacement ? (
          <div className="glass-panel p-space-sm flex items-center gap-space-sm">
            <span className="text-[#FF0D7B] flex-shrink-0"><Printer className="size-5" aria-hidden /></span>
            <div>
              <p className="font-label-md text-label-md text-white">
                Print area: {defaultPlacement.label} · {defaultPlacement.widthIn}″ × {defaultPlacement.heightIn}″
              </p>
              <p className="font-body-sm text-body-sm text-white/50">
                Print charge {formatINR(printCost)} · {product.printPricing.ratePerSqIn > 0
                  ? `₹${product.printPricing.ratePerSqIn.toFixed(2)}/in² · min ₹${product.printPricing.minimum}`
                  : "flat placement rate"} · studio prices your artwork&apos;s exact area.
              </p>
            </div>
            <Link
              href={`/design/${product.id}`}
              className="ml-auto inline-flex items-center gap-1 px-4 h-9 rounded-full bg-white/[0.06] border border-white/15 font-label-md text-label-md text-white hover:bg-white/[0.12] transition-all"
            >
              <Check className="size-3.5" /> Open studio
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
