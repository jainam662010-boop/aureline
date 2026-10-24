import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/product/catalog-view";
import { listProducts, listCategories, getCatalogFacets, type CatalogFilters } from "@/lib/catalog";
import { PageSkeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom T-Shirts, Hoodies & Merch Blanks",
  description:
    "Browse heavyweight tees, oversized drops, hoodies, polos, kids tees and canvas totes. Filter by GSM, colour, size and fabric — every blank printable from a single piece.",
  alternates: { canonical: "/products" },
};

const STATIC_EXPORT = process.env.STATIC_EXPORT === "1";

interface SearchParams {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  color?: string;
  size?: string;
  fabric?: string;
  bestseller?: string;
  new?: string;
  sort?: string;
  page?: string;
}

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const filters: CatalogFilters = {
    q: searchParams.q,
    category: searchParams.category,
    minPrice: searchParams.min ? Number(searchParams.min) : undefined,
    maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
    color: searchParams.color,
    size: searchParams.size,
    fabric: searchParams.fabric,
    bestseller: searchParams.bestseller === "1",
    newArrival: searchParams.new === "1",
    sort: (searchParams.sort as CatalogFilters["sort"]) ?? "popularity",
    page: searchParams.page ? Number(searchParams.page) : 1,
    perPage: 12,
  };

  // In static exports filtering must run in the browser, so ship every blank
  // up-front and let CatalogView slice/sort client-side (clientMode).
  if (STATIC_EXPORT) {
    const [all, categories, facets] = await Promise.all([
      listProducts({ perPage: 48 }),
      listCategories(),
      getCatalogFacets(),
    ]);
    return (
      <CatalogView
        initialResult={{ items: [], total: 0, page: 1, perPage: 48, totalPages: 1 }}
        clientMode
        allItems={all.items}
        categories={categories.map((c: { name: string; slug: string; _count?: { products: number } }) => ({
          name: c.name,
          slug: c.slug,
          count: c._count?.products ?? 0,
        }))}
        facets={facets}
        filters={filters}
      />
    );
  }

  const [result, categories, facets] = await Promise.all([
    listProducts(filters),
    listCategories(),
    getCatalogFacets(),
  ]);

  return (
    <CatalogView
      initialResult={result}
      categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products }))}
      facets={facets}
      filters={filters}
    />
  );
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = STATIC_EXPORT ? ({} as SearchParams) : await searchParams;

  return (
    <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-xl">
        <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
          Blanks repertoire
        </span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">
          {params.category
            ? params.category.replace(/-/g, " ")
            : params.q
              ? `Results for “${params.q}”`
              : `All garments · ${APP_NAME}`}
        </h1>
        <p className="font-body-md text-body-md text-white/60 mt-space-xs max-w-2xl">
          Every blank below prints from a single piece with zero minimum order quantity. Prices shown are base blanks —
          add your design in the studio for the final per-piece quote.
        </p>
      </div>

      <Suspense key={STATIC_EXPORT ? "static-catalog" : JSON.stringify(params)} fallback={<PageSkeleton lines={3} />}>
        <Catalog searchParams={params} />
      </Suspense>
    </div>
  );
}
