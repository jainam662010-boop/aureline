import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMyOrders } from "@/actions/orders";
import { OrdersList } from "@/components/orders/orders-list";
import { StaticNotice } from "@/components/shared/static-notice";

export const metadata: Metadata = {
  title: "Your Orders",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (process.env.STATIC_EXPORT === "1") {
    return (
      <div className="max-w-5xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
        <div className="mb-space-lg">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
            Production history
          </span>
          <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Your orders</h1>
        </div>
        <StaticNotice
          title="Order history needs the live backend"
          description="Accounts and order records live in the database, which isn't part of this static demo. Everything else — browsing, the design studio and the cart — works right here in your browser."
        />
      </div>
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/orders");

  const result = await listMyOrders();
  const orders = result.ok ? result.data : [];

  return (
    <div className="max-w-5xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-lg">
        <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
          Production history
        </span>
        <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Your orders</h1>
        <p className="font-body-md text-body-md text-slate-600 mt-space-xs">
          Track every order from payment through artwork review, production and delivery.
        </p>
      </div>

      <OrdersList orders={orders} />
    </div>
  );
}
