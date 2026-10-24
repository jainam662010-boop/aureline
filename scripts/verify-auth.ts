// Dev helper: verifies the seeded admin can authenticate through the app's own
// server action logic (bcrypt compare + role), without needing a browser.
// Run:  node_modules\.bin\tsx.cmd scripts\verify-auth.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@aureline.in";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`FAIL: no user ${email}`);
    process.exit(1);
  }
  console.log(`user found      ${user.email}`);
  console.log(`role            ${user.role}`);
  console.log(`isActive        ${user.isActive}`);
  console.log(`has password    ${Boolean(user.passwordHash)}`);

  if (!user.passwordHash) {
    console.log("FAIL: no password hash");
    process.exit(1);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`bcrypt verify   ${ok ? "PASS" : "FAIL"}`);

  // Confirm the pricing engine resolves seeded tiers + placements.
  const tiers = await prisma.quantityDiscount.findMany({ orderBy: { minQty: "asc" } });
  console.log(`tiers           ${tiers.length} (${tiers.map((t) => `${t.minQty}+`).join(", ")})`);

  const placements = await prisma.printPlacement.findMany();
  console.log(`placements      ${placements.map((p) => p.key).join(", ")}`);

  const p = await prisma.product.findFirst({ where: { slug: "heavyweight-box-tee" } });
  console.log(`tee placements  ${p ? JSON.stringify(p.placementKeys) : "missing"}`);

  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
