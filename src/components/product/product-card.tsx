import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { GarmentMockup, garmentTypeFromCategory } from "@/components/shared/garment-mockup";
import { SheenCard } from "@/components/shared/sheen-card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import type { ProductListItem } from "@/lib/catalog";

interface ProductCardProps {
  product: ProductListItem;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const firstColor = product.colors[0]?.hex ?? "#111111";
  const garment = garmentTypeFromCategory(product.category.slug);

  return (
    <SheenCard
      as="article"
      className="glass-panel glass-card-hover p-space-md flex flex-col justify-between shadow-[0_8px_32px_0_rgba(15,23,42,0.12)]"
    >
      <div>
        <Link
          href={`/products/${product.slug}`}
          className="relative block w-full h-72 rounded-2xl overflow-hidden bg-slate-900/[0.02] mb-space-md group"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-space-md transition-transform duration-500 group-hover:scale-105">
              <GarmentMockup type={garment} color={firstColor} className="h-full w-auto" />
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            <span className="backdrop-blur-xl bg-white/90 border border-slate-900/10 px-2.5 py-1 rounded-full font-label-technical text-label-technical text-slate-900 font-bold shadow-sm">
              {product.gsm} GSM
            </span>
            {product.isBestseller ? (
              <span className="backdrop-blur-xl bg-[#2563EB] border border-[#2563EB] px-2.5 py-1 rounded-full font-label-technical text-label-technical text-white shadow-sm">
                Bestseller
              </span>
            ) : null}
          </div>
          {product.isNewArrival ? (
            <span className="absolute top-3 right-3 backdrop-blur-xl bg-white/90 border border-slate-900/10 px-2.5 py-1 rounded-full font-label-technical text-label-technical text-[#0891B2] font-bold shadow-sm">
              New
            </span>
          ) : null}
        </Link>

        <div className="flex items-center justify-between mb-1 gap-space-xs">
          <h3 className="font-headline-md text-headline-md font-bold text-slate-900 truncate">{product.name}</h3>
          <div className="text-right flex-shrink-0">
            <span className="font-label-lg text-label-lg font-bold text-[#2563EB]">{formatINR(product.basePrice)}</span>
            {product.compareAtPrice ? (
              <span className="block font-label-technical text-label-technical text-slate-500 line-through">
                {formatINR(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-slate-600 mb-space-sm line-clamp-2">
          {product.tagline ?? `${product.fabric}. Zero minimum order quantity.`}
        </p>

        <div className="flex flex-wrap items-center gap-space-xs mb-space-sm">
          <span className="chip">{product.category.name}</span>
          {product.sizes.slice(0, 4).map((size) => (
            <span key={size} className="chip">
              {size}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-space-xs mb-space-md" aria-label="Available colours">
          {product.colors.slice(0, 5).map((color) => (
            <span
              key={color.hex}
              title={color.name}
              className="w-4 h-4 rounded-full border border-slate-900/[0.1]"
              style={{ backgroundColor: color.hex }}
            />
          ))}
          {product.colors.length > 5 ? (
            <span className="font-label-technical text-[9px] text-slate-500">+{product.colors.length - 5}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-space-xs">
        <Link
          href={`/products/${product.slug}`}
          className="flex-1 py-space-sm rounded-full bg-slate-900/[0.06] border border-slate-900/[0.1] hover:bg-slate-900/[0.1] text-slate-900 font-label-md text-label-md text-center transition-all"
        >
          Details
        </Link>
        <Link
          href={`/design/${product.id}`}
          className="flex-1 py-space-sm rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] hover:brightness-110 text-white font-label-md text-label-md text-center transition-all flex items-center justify-center gap-1 shadow-[0_0_18px_rgba(14,165,233,0.35)]"
        >
          Customize
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </SheenCard>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass-panel p-space-md animate-pulse">
      <div className="h-72 rounded-2xl bg-slate-900/[0.04] mb-space-md skeleton-shimmer" />
      <div className="h-5 w-2/3 rounded-full bg-slate-900/[0.05] mb-2 skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded-full bg-slate-900/[0.04] mb-4 skeleton-shimmer" />
      <div className="h-9 w-full rounded-full bg-slate-900/[0.05] skeleton-shimmer" />
    </div>
  );
}

export { Badge };
