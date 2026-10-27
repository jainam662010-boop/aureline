import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartPayload } from "@/actions/cart";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { StaticNotice } from "@/components/shared/static-notice";

export const metadata: Metadata = {
  title: "Secure Checkout",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  if (process.env.STATIC_EXPORT === "1") {
    return (
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
        <div className="mb-space-lg">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
            Secure · Razorpay
          </span>
          <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Checkout</h1>
        </div>
        <StaticNotice
          title="Payments are switched off in the demo"
          description="This GitHub Pages build is fully static — it cannot reach the database or Razorpay, so checkout ends here. Your cart is saved in the browser; run the app locally or deploy it on Vercel to complete real orders."
        />
      </div>
    );
  }
  const [session, cartResult] = await Promise.all([getServerSession(authOptions), getCartPayload()]);

  const cart = cartResult.ok ? cartResult.data : null;
  if (!cart || cart.items.length === 0) redirect("/cart");

  const savedAddresses = session?.user?.id
    ? await prisma.address.findMany({
        where: { userId: session.user.id, deletedAt: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          label: true,
          fullName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          pincode: true,
        },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-lg">
        <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
          Secure · Razorpay
        </span>
        <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Checkout</h1>
        <p className="font-body-md text-body-md text-slate-600 mt-space-xs">
          Nothing prints until our team approves your artwork. You&apos;ll get an email at every stage.
        </p>
      </div>

      <CheckoutClient cart={cart} savedAddresses={savedAddresses} isLoggedIn={Boolean(session?.user?.id)} />
    </div>
  );
}
