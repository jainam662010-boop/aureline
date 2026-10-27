import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listDesigns } from "@/actions/design";
import { AccountClient, type AccountAddress, type AccountDesign } from "@/components/account/account-client";
import { listMyOrders } from "@/actions/orders";
import { StaticNotice } from "@/components/shared/static-notice";

export const metadata: Metadata = {
  title: "Your Account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (process.env.STATIC_EXPORT === "1") {
    return (
      <div className="max-w-6xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
        <div className="mb-space-lg">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
            Your atelier profile
          </span>
          <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Account</h1>
        </div>
        <StaticNotice
          title="Accounts need the live backend"
          description="Sign-in, saved designs and profiles live in the database, which isn't part of this static demo build. Try the design studio instead — your artwork stays in your browser tab."
          linkHref="/products"
          linkLabel="Open the design studio"
        />
      </div>
    );
  }
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const { tab } = await searchParams;

  const [user, designsResult, ordersResult] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    }),
    listDesigns(),
    listMyOrders(),
  ]);
  if (!user) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const serializedAddresses: AccountAddress[] = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  }));

  const designs: AccountDesign[] = designsResult.ok
    ? designsResult.data.map((d) => ({
        id: d.id,
        name: d.name,
        productId: d.productId,
        productSlug: d.productSlug,
        productName: d.productName,
        thumbnailUrl: d.thumbnailUrl,
        updatedAt: d.updatedAt,
      }))
    : [];

  const orders = ordersResult.ok ? ordersResult.data : [];
  const totalSpend = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="max-w-6xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-lg flex items-end justify-between gap-space-md flex-wrap">
        <div>
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
            Your atelier profile
          </span>
          <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">
            {user.name ?? "Account"}
          </h1>
          <p className="font-body-md text-body-md text-slate-600 mt-space-xs">
            {user.email} · member since {new Date(user.createdAt).getFullYear()}
          </p>
        </div>

        <div className="flex gap-space-sm">
          {[
            { label: "Orders", value: String(orders.length) },
            { label: "Designs", value: String(designs.length) },
            { label: "Lifetime spend", value: `₹${Math.round(totalSpend).toLocaleString("en-IN")}` },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel-sm px-space-md py-space-sm text-center min-w-24">
              <p className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">{stat.value}</p>
              <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <AccountClient
        initialTab={tab}
        user={{ name: user.name ?? "", email: user.email, phone: user.phone ?? "", role: user.role }}
        addresses={serializedAddresses}
        designs={designs}
        orderCount={orders.length}
      />
    </div>
  );
}
