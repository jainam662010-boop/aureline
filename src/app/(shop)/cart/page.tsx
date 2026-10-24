import type { Metadata } from "next";
import { getCartPayload } from "@/actions/cart";
import { CartClient } from "@/components/cart/cart-client";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const result = await getCartPayload();

  return (
    <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg py-space-xl">
      <div className="mb-space-lg">
        <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
          Your selection
        </span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Cart</h1>
      </div>

      <CartClient initialCart={result.ok ? result.data : null} />
    </div>
  );
}
