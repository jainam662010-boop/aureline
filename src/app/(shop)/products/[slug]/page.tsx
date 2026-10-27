import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { getPlacementsForProduct, getSettings } from "@/lib/commerce";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { ProductCard } from "@/components/product/product-card";
import { num } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT === "1") {
    const { PRODUCTS } = await import("@/lib/static-catalog");
    return PRODUCTS.filter((p) => p.status === "ACTIVE").map((p) => ({ slug: p.slug }));
  }
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const title = `${product.name} — Custom ${product.category.name} Printing`;
  const description = `${product.tagline ?? product.description.slice(0, 140)} ${product.gsm} GSM ${product.fabric}. Print a single piece from ${product.category.name.toLowerCase()} with zero minimum order. ${APP_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/products/${product.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [placements, related, settings] = await Promise.all([
    getPlacementsForProduct(product),
    getRelatedProducts(product.id, product.categoryId, 4),
    getSettings(),
  ]);

  const serialized = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    description: product.description,
    fabric: product.fabric,
    gsm: product.gsm,
    fit: product.fit,
    careInstructions: product.careInstructions,
    basePrice: num(product.basePrice),
    compareAtPrice: product.compareAtPrice ? num(product.compareAtPrice) : null,
    gstRate: num(product.gstRate),
    weightGrams: product.weightGrams,
    isBestseller: product.isBestseller,
    isNewArrival: product.isNewArrival,
    category: { name: product.category.name, slug: product.category.slug },
    images: product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, side: img.side, colorHex: img.colorHex })),
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorName: v.colorName,
      colorHex: v.colorHex,
      stock: v.stock,
      priceDelta: num(v.priceDelta),
      sku: v.sku,
    })),
    placements: placements.map((p) => ({
      key: p.key,
      label: p.label,
      side: p.side,
      widthIn: p.widthIn,
      heightIn: p.heightIn,
      baseCost: num(p.baseCost),
      surcharge: num(p.surcharge),
    })),
    printPricing: { ratePerSqIn: settings.printRatePerSqIn, minimum: settings.printMinimum },
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <nav aria-label="Breadcrumb" className="mb-space-md">
        <ol className="flex items-center gap-space-xs font-label-technical text-label-technical uppercase tracking-widest text-slate-500">
          <li><Link href="/" className="hover:text-slate-900 transition-colors">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/products" className="hover:text-slate-900 transition-colors">Blanks</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/products?category=${product.category.slug}`} className="hover:text-slate-900 transition-colors">{product.category.name}</Link></li>
          <li aria-hidden>/</li>
          <li className="text-slate-800 truncate max-w-[14ch]">{product.name}</li>
        </ol>
      </nav>

      <ProductDetailClient product={serialized} />

      {related.length > 0 ? (
        <section className="mt-space-xl" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight mb-space-md">
            Related blanks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
