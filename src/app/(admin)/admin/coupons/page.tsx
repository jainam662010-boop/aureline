import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CouponsManager } from "@/components/admin/coupons-manager";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const coupons = await prisma.coupon.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  // Orders reference coupons by code (no FK), so redemptions are counted by code.
  const codes = coupons.map((c) => c.code);
  const redemptionGroups = codes.length
    ? await prisma.order.groupBy({
        by: ["couponCode"],
        where: { couponCode: { in: codes } },
        _count: { _all: true },
      })
    : [];
  const redemptionMap = new Map(redemptionGroups.map((g) => [g.couponCode, g._count._all]));

  const serialized = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: Number(coupon.value),
    minOrderAmount: Number(coupon.minOrderAmount),
    maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    endsAt: coupon.endsAt?.toISOString() ?? null,
    isActive: coupon.isActive,
    redemptions: redemptionMap.get(coupon.code) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-space-md">
      <header>
        <span className="label-tech">{coupons.length} codes</span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Coupons</h1>
      </header>

      <CouponsManager coupons={serialized} />
    </div>
  );
}
