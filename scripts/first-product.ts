// Dev helper: prints the first product id + slug so the studio route can be tested.
// Run:  node_modules\.bin\tsx.cmd scripts\first-product.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true },
    take: 3,
  });
  for (const p of products) {
    console.log(`${p.id}|${p.slug}|${p.name}`);
  }
  const counts = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    placements: await prisma.printPlacement.count(),
    users: await prisma.user.count(),
  };
  console.log("COUNTS|" + JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
