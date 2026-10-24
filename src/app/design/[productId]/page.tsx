import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlacementsForProduct, getSettings } from "@/lib/commerce";
import { DesignStudio } from "@/components/editor/design-studio";
import { createEmptyDesign, type DesignDocument } from "@/lib/editor-types";
import { num } from "@/lib/utils";
import { garmentTypeFromCategory } from "@/components/shared/garment-mockup";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design Studio",
  robots: { index: false, follow: true },
};

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT === "1") {
    const { PRODUCTS } = await import("@/lib/static-catalog");
    return PRODUCTS.map((p) => ({ productId: p.id }));
  }
  return [];
}

interface StudioProductInput {
  id: string;
  name: string;
  slug: string;
  category: { name: string; slug: string };
  basePrice: unknown;
  gstRate: unknown;
  variants: {
    id: string;
    size: string;
    colorName: string;
    colorHex: string;
    stock: number;
    priceDelta: unknown;
  }[];
}

interface PlacementInput {
  key: string;
  label: string;
  side: "FRONT" | "BACK";
  widthIn: number;
  heightIn: number;
  topPct: number;
  leftPct: number;
  baseCost: unknown;
  surcharge: unknown;
}

function serializeStudioProduct(
  product: StudioProductInput,
  placements: PlacementInput[],
) {
  // Colour list (ordered by first appearance)
  const colorMap = new Map<string, { name: string; hex: string }>();
  product.variants.forEach((v) => {
    if (!colorMap.has(v.colorHex)) colorMap.set(v.colorHex, { name: v.colorName, hex: v.colorHex });
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categorySlug: garmentTypeFromCategory(product.category.slug),
    basePrice: num(product.basePrice as string | number),
    gstRate: num(product.gstRate as string | number),
    colors: [...colorMap.values()],
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorName: v.colorName,
      colorHex: v.colorHex,
      stock: v.stock,
      priceDelta: num(v.priceDelta as string | number),
    })),
    placements: placements.map((p) => ({
      key: p.key,
      label: p.label,
      side: p.side,
      widthIn: p.widthIn,
      heightIn: p.heightIn,
      topPct: p.topPct,
      leftPct: p.leftPct,
      baseCost: num(p.baseCost as string | number),
      surcharge: num(p.surcharge as string | number),
    })),
  };
}

interface Props {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ design?: string }>;
}

export default async function DesignPage({ params, searchParams }: Props) {
  const { productId } = await params;

  /* ---------------------------------------------------------------------------
   * Static export (GitHub Pages): resolve the blank from the committed snapshot
   * with no database or session. Designs stay client-side in this mode.
   * ------------------------------------------------------------------------ */
  if (process.env.STATIC_EXPORT === "1") {
    const { getProductById } = await import("@/lib/static-catalog");
    const product = await getProductById(productId);
    if (!product) notFound();

    const placements = await getPlacementsForProduct(product as never);
    const serialized = serializeStudioProduct(product, placements as never);
    const settings = await getSettings();

    return (
      <DesignStudio
        product={serialized}
        initialDoc={createEmptyDesign()}
        initialDesignId={null}
        isLoggedIn={false}
        printPricing={{ ratePerSqIn: settings.printRatePerSqIn, minimum: settings.printMinimum }}
      />
    );
  }

  const { design: designParam } = searchParams ? await searchParams : { design: undefined };

  const [session, product] = await Promise.all([
    getServerSession(authOptions),
    prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: "ACTIVE" },
      include: {
        category: true,
        variants: { where: { isActive: true, stock: { gt: 0 } }, orderBy: [{ colorName: "asc" }, { size: "asc" }] },
      },
    }),
  ]);

  if (!product) notFound();

  const placements = await getPlacementsForProduct(product);

  // Resume a saved design when provided
  let initialDoc: DesignDocument | null = null;
  let initialDesignId: string | null = null;
  if (designParam && session?.user?.id) {
    const saved = await prisma.design.findFirst({
      where: { id: designParam, userId: session.user.id, deletedAt: null },
    });
    if (saved && saved.productId === product.id) {
      initialDoc = (saved.state as unknown as DesignDocument) ?? createEmptyDesign();
      initialDesignId = saved.id;
    }
  }

  const serialized = serializeStudioProduct(product, placements);
  const settings = await getSettings();

  return (
    <DesignStudio
      product={serialized}
      initialDoc={initialDoc}
      initialDesignId={initialDesignId}
      isLoggedIn={Boolean(session?.user?.id)}
      printPricing={{ ratePerSqIn: settings.printRatePerSqIn, minimum: settings.printMinimum }}
    />
  );
}
