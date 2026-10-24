import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const products = await prisma.product.findMany({
    orderBy: [{ popularity: "desc" }, { name: "asc" }],
    include: {
      category: { select: { name: true, slug: true } },
      variants: { select: { id: true, size: true, colorName: true, stock: true, priceDelta: true } },
      _count: { select: { orderItems: true } },
    },
  });

  const serialized = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.category.name,
    basePrice: Number(product.basePrice),
    status: product.status,
    isBestseller: product.isBestseller,
    isNewArrival: product.isNewArrival,
    unitsSold: product._count.orderItems,
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorName: v.colorName,
      stock: v.stock,
      priceDelta: Number(v.priceDelta),
    })),
  }));

  return (
    <div className="flex flex-col gap-space-md">
      <header>
        <span className="label-tech">{products.length} blanks</span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Products</h1>
      </header>

      <ProductsTable products={serialized} />
    </div>
  );
}
