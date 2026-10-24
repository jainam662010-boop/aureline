"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/states";
import { cn, formatINR } from "@/lib/utils";
import type { CatalogFilters, ProductListItem } from "@/lib/catalog";

interface CatalogViewProps {
  initialResult: {
    items: ProductListItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  categories: { name: string; slug: string; count: number }[];
  facets: { colors: { name: string; hex: string }[]; sizes: string[]; fabrics: string[] };
  filters: CatalogFilters;
  /** Static export: filtering/sorting/pagination run entirely in the browser. */
  clientMode?: boolean;
  /** Full unfiltered list, required when clientMode is on. */
  allItems?: ProductListItem[];
}

/** Pure client-side replicate of the server catalog filter for static builds. */
function applyClientFilters(all: ProductListItem[], f: CatalogFilters) {
  const perPage = 12;
  const filtered = all.filter((p) => {
    if (f.category && p.category.slug !== f.category) return false;
    if (f.bestseller && !p.isBestseller) return false;
    if (f.newArrival && !p.isNewArrival) return false;
    if (f.fabric && !p.fabric.toLowerCase().includes(f.fabric.toLowerCase())) return false;
    if (f.minPrice !== undefined && p.basePrice < f.minPrice) return false;
    if (f.maxPrice !== undefined && p.basePrice > f.maxPrice) return false;
    if (f.size && !p.sizes.includes(f.size)) return false;
    if (f.color && !p.colors.some((c) => c.hex.toUpperCase() === f.color!.toUpperCase())) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      const hit =
        p.name.toLowerCase().includes(q) ||
        (p.tagline ?? "").toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
  filtered.sort((a, b) =>
    f.sort === "price-asc"
      ? a.basePrice - b.basePrice
      : f.sort === "price-desc"
        ? b.basePrice - a.basePrice
        : f.sort === "newest"
          ? 0
          : 0,
  );
  const total = filtered.length;
  const page = Math.min(Math.max(1, f.page ?? 1), Math.max(1, Math.ceil(total / perPage)));
  return {
    items: filtered.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export function CatalogView({ initialResult, categories, facets, filters, clientMode = false, allItems }: CatalogViewProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [min, setMin] = React.useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = React.useState(filters.maxPrice?.toString() ?? "");
  // clientMode keeps filter state local (URL re-fetch needs a server).
  const [clientFilters, setClientFilters] = React.useState<CatalogFilters>(filters);

  const result = React.useMemo(
    () => (clientMode && allItems ? applyClientFilters(allItems, clientFilters) : initialResult),
    [clientMode, allItems, clientFilters, initialResult],
  );
  const current = clientMode ? result : initialResult;

  const update = React.useCallback(
    (patch: Record<string, string | number | boolean | undefined>, resetPage = true) => {
      if (clientMode) {
        setClientFilters((prev) => {
          const next: CatalogFilters = {
            q: prev.q,
            category: prev.category as string | undefined,
            minPrice: prev.minPrice,
            maxPrice: prev.maxPrice,
            color: prev.color,
            size: prev.size,
            fabric: prev.fabric,
            bestseller: prev.bestseller,
            newArrival: prev.newArrival,
            sort: prev.sort,
            page: resetPage ? 1 : prev.page ?? 1,
            perPage: 12,
          };
          // Translate the URL-key patch language into filter state.
          const p = patch as Record<string, string | undefined>;
          if ("q" in p) next.q = p.q;
          if ("category" in p) next.category = p.category;
          if ("min" in p) next.minPrice = p.min ? Number(p.min) : undefined;
          if ("max" in p) next.maxPrice = p.max ? Number(p.max) : undefined;
          if ("color" in p) next.color = p.color;
          if ("size" in p) next.size = p.size;
          if ("fabric" in p) next.fabric = p.fabric;
          if ("bestseller" in p) next.bestseller = p.bestseller === "1" ? true : undefined;
          if ("new" in p) next.newArrival = p.new === "1" ? true : undefined;
          if ("sort" in p) next.sort = (p.sort as CatalogFilters["sort"]) ?? "popularity";
          if ("page" in p && p.page) next.page = Number(p.page);
          return next;
        });
        return;
      }
      const params = new URLSearchParams();
      const merged: Record<string, string | undefined> = {
        q: filters.q,
        category: filters.category,
        min: filters.minPrice?.toString(),
        max: filters.maxPrice?.toString(),
        color: filters.color,
        size: filters.size,
        fabric: filters.fabric,
        bestseller: filters.bestseller ? "1" : undefined,
        new: filters.newArrival ? "1" : undefined,
        sort: filters.sort && filters.sort !== "popularity" ? filters.sort : undefined,
        page: resetPage ? undefined : (filters.page ?? 1).toString(),
        ...(patch as Record<string, string | undefined>),
      };
      Object.entries(merged).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
    },
    [clientMode, filters, router],
  );

  const activeFilterCount = [
    filters.category,
    filters.color,
    filters.size,
    filters.fabric,
    filters.minPrice,
    filters.maxPrice,
    filters.bestseller,
    filters.newArrival,
    filters.q,
  ].filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
      {/* Filter rail */}
      <aside className={cn("lg:col-span-3", mobileOpen ? "block" : "hidden lg:block")}>
        <div className="glass-panel p-space-md lg:sticky lg:top-24 flex flex-col gap-space-md max-h-[calc(100vh-8rem)] overflow-y-auto hide-scrollbar">
          <div className="flex items-center justify-between">
            <span className="font-label-lg text-label-lg font-bold text-white">Filters</span>
            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMin("");
                  setMax("");
                  if (clientMode) {
                    setClientFilters({ page: 1, perPage: 12 } as CatalogFilters);
                    return;
                  }
                  update({ category: undefined, color: undefined, size: undefined, fabric: undefined, min: undefined, max: undefined, bestseller: undefined, new: undefined, q: undefined });
                }}
              >
                Clear ({activeFilterCount})
              </Button>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ min: min || undefined, max: max || undefined });
            }}
            className="flex flex-col gap-space-xs"
          >
            <Label htmlFor="catalog-search">Search</Label>
            <Input
              id="catalog-search"
              {...(clientMode
                ? { value: clientFilters.q ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ q: e.target.value || undefined }) }
                : { defaultValue: filters.q ?? "" })}
              placeholder="heavyweight, tote, 280..."
              className="h-10"
            />
          </form>

          <FilterGroup title="Category">
            {categories.map((c) => (
              <FilterRow
                key={c.slug}
                label={`${c.name} (${c.count})`}
                checked={filters.category === c.slug}
                onChange={() => update({ category: filters.category === c.slug ? undefined : c.slug })}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Price range (base blank)">
            <div className="flex items-center gap-space-xs">
              <Input
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
                placeholder="Min ₹"
                className="h-10"
                aria-label="Minimum price"
              />
              <span className="text-white/40">—</span>
              <Input
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
                placeholder="Max ₹"
                className="h-10"
                aria-label="Maximum price"
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-space-xs" onClick={() => update({ min: min || undefined, max: max || undefined })}>
              Apply
            </Button>
          </FilterGroup>

          <FilterGroup title="Colour">
            <div className="flex flex-wrap gap-space-xs">
              {facets.colors.slice(0, 14).map((color) => {
                const active = filters.color?.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={active}
                    onClick={() => update({ color: active ? undefined : color.hex })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      active ? "border-[#FF3B30] scale-110 shadow-[0_0_12px_rgba(255,59,48,0.5)]" : "border-white/20 hover:border-white/50",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup title="Size">
            <div className="flex flex-wrap gap-space-xs">
              {facets.sizes.map((size) => {
                const active = filters.size === size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ size: active ? undefined : size })}
                    className={cn(
                      "px-3 py-1.5 rounded-full font-label-md text-label-md border transition-all",
                      active
                        ? "bg-white/[0.15] border-white/30 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:border-white/30",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup title="Fabric">
            <div className="flex flex-col gap-space-xs">
              {facets.fabrics.map((fabric) => (
                <FilterRow
                  key={fabric}
                  label={fabric}
                  checked={filters.fabric === fabric}
                  onChange={() => update({ fabric: filters.fabric === fabric ? undefined : fabric })}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Flags">
            <FilterRow
              label="Bestsellers"
              checked={Boolean(filters.bestseller)}
              onChange={() => update({ bestseller: filters.bestseller ? undefined : "1" })}
            />
            <FilterRow
              label="New arrivals"
              checked={Boolean(filters.newArrival)}
              onChange={() => update({ new: filters.newArrival ? undefined : "1" })}
            />
          </FilterGroup>
        </div>
      </aside>

      {/* Results */}
      <div className="lg:col-span-9">
        <div className="flex items-center justify-between gap-space-sm mb-space-md flex-wrap">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/50">
            {current.total} products
          </span>

          <div className="flex items-center gap-space-xs">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
              <SlidersHorizontal className="size-4" />
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </Button>
            <label htmlFor="sort-select" className="sr-only">Sort products</label>
            <Select
              id="sort-select"
              className="h-10 w-56"
              value={filters.sort ?? "popularity"}
              onChange={(e) => update({ sort: e.target.value })}
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
              <option value="newest">Newest first</option>
            </Select>
          </div>
        </div>

        {current.items.length === 0 ? (
          <EmptyState
            title="No blanks match those filters"
            description="Try widening the price range, clearing the colour filter, or searching for a fabric like 'French Terry'."
            action={
              <Button variant="outline" onClick={() => { if (clientMode) { setClientFilters({ page: 1, perPage: 12 } as CatalogFilters); setMin(""); setMax(""); } else { router.push("/products"); } }}>
                <X className="size-4" /> Clear all filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md">
              {current.items.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 3} />
              ))}
            </div>

            {current.totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-space-xs mt-space-xl" aria-label="Pagination">
                {Array.from({ length: initialResult.totalPages }).map((_, i) => {
                  const page = i + 1;
                  const active = page === current.page;
                  return (
                    <button
                      key={page}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => update({ page: page.toString() }, false)}
                      className={cn(
                        "min-w-10 h-10 px-3 rounded-full font-label-lg text-label-lg transition-all",
                        active
                          ? "bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] text-white shadow-[0_0_18px_rgba(255,13,123,0.4)]"
                          : "bg-white/[0.05] border border-white/10 text-white/70 hover:bg-white/[0.1]",
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-space-xs border-t border-white/[0.06] pt-space-md">
      <legend className="label-tech mb-space-xs">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-space-xs cursor-pointer group py-1">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className={cn("font-body-md text-body-md transition-colors", checked ? "text-white" : "text-white/60 group-hover:text-white/90")}>
        {label}
      </span>
    </label>
  );
}

export { formatINR };
