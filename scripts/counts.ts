// Dev helper: prints row counts so you can sanity-check a seed.
// Run:  node_modules\.bin\tsx.cmd scripts\counts.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [products, variants, coupons, categories, placements, tiers, users, designs] =
    await Promise.all([
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.coupon.count(),
      prisma.category.count(),
      prisma.printPlacement.count(),
      prisma.quantityDiscount.count(),
      prisma.user.count(),
      prisma.design.count(),
    ]);

  console.log(`products     ${products}`);
  console.log(`variants     ${variants}`);
  console.log(`categories   ${categories}`);
  console.log(`coupons      ${coupons}`);
  console.log(`placements   ${placements}`);
  console.log(`tiers        ${tiers}`);
  console.log(`users        ${users}`);
  console.log(`designs      ${designs}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
