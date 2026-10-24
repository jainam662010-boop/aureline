import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

export interface CatalogFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  fabric?: string;
  bestseller?: boolean;
  newArrival?: boolean;
  sort?: "popularity" | "price-asc" | "price-desc" | "newest";
  page?: number;
  perPage?: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  gsm: number;
  fabric: string;
  isBestseller: boolean;
  isNewArrival: boolean;
  popularity: number;
  category: { name: string; slug: string };
  colors: { name: string; hex: string }[];
  sizes: string[];
  image: string | null;
}

export async function listProducts(filters: CatalogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, Math.max(1, filters.perPage ?? 12));

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    status: "ACTIVE",
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.bestseller ? { isBestseller: true } : {}),
    ...(filters.newArrival ? { isNewArrival: true } : {}),
    ...(filters.fabric ? { fabric: { contains: filters.fabric } } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q } },
            { description: { contains: filters.q } },
            { tagline: { contains: filters.q } },
            { category: { name: { contains: filters.q } } },
            { fabric: { contains: filters.q } },
          ],
        }
      : {}),
    ...(filters.size || filters.color
      ? {
          variants: {
            some: {
              isActive: true,
              ...(filters.size ? { size: filters.size } : {}),
              ...(filters.color ? { colorHex: filters.color.toUpperCase() } : {}),
            },
          },
        }
      : {}),
  };

  // Price range is evaluated against basePrice + min variant delta
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { basePrice: "asc" }
      : filters.sort === "price-desc"
        ? { basePrice: "desc" }
        : filters.sort === "newest"
          ? { createdAt: "desc" }
          : { popularity: "desc" };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        variants: { where: { isActive: true }, select: { size: true, colorName: true, colorHex: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const items: ProductListItem[] = products.map((p) => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    p.variants.forEach((v) => {
      if (!colorMap.has(v.colorHex)) colorMap.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
    });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      basePrice: num(p.basePrice),
      compareAtPrice: p.compareAtPrice ? num(p.compareAtPrice) : null,
      gsm: p.gsm,
      fabric: p.fabric,
      isBestseller: p.isBestseller,
      isNewArrival: p.isNewArrival,
      popularity: p.popularity,
      category: p.category,
      colors: [...colorMap.values()],
      sizes: [...new Set(p.variants.map((v) => v.size))],
      image: p.images[0]?.url ?? null,
    };
  });

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, deletedAt: null, status: "ACTIVE" },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ colorName: "asc" }, { size: "asc" }] },
    },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: "ACTIVE", id: { not: productId }, categoryId },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { where: { isActive: true }, select: { size: true, colorName: true, colorHex: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
    orderBy: { popularity: "desc" },
    take: limit,
  });

  return products.map((p) => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    p.variants.forEach((v) => {
      if (!colorMap.has(v.colorHex)) colorMap.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
    });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      basePrice: num(p.basePrice),
      compareAtPrice: p.compareAtPrice ? num(p.compareAtPrice) : null,
      gsm: p.gsm,
      fabric: p.fabric,
      isBestseller: p.isBestseller,
      isNewArrival: p.isNewArrival,
      popularity: p.popularity,
      category: p.category,
      colors: [...colorMap.values()],
      sizes: [...new Set(p.variants.map((v) => v.size))],
      image: p.images[0]?.url ?? null,
    } satisfies ProductListItem;
  });
}

export async function getFeaturedProducts(limit = 4) {
  const result = await listProducts({ sort: "popularity", perPage: limit });
  return result.items;
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    include: { _count: { select: { products: { where: { deletedAt: null, status: "ACTIVE" } } } } },
  });
}

/** Facet values for the catalog filter rail. */
export async function getCatalogFacets() {
  const [colors, sizes, fabrics] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE", deletedAt: null } },
      select: { colorName: true, colorHex: true },
      distinct: ["colorHex"],
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE", deletedAt: null } },
      select: { size: true },
      distinct: ["size"],
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { fabric: true },
      distinct: ["fabric"],
    }),
  ]);

  return {
    colors: colors.map((c) => ({ name: c.colorName, hex: c.colorHex })),
    sizes: sizes.map((s) => s.size),
    fabrics: fabrics.map((f) => f.fabric),
  };
}
