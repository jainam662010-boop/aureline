"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Pencil, Tag, ShoppingBag, ArrowRight, Palette } from "lucide-react";
import { GarmentMockup, garmentTypeFromCategory, type GarmentType } from "@/components/shared/garment-mockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmptyState, Spinner } from "@/components/ui/states";
import { applyCoupon, removeCoupon, removeCartItem, updateCartItemQuantity } from "@/actions/cart";
import type { SerializedCart } from "@/actions/cart";
import { cn, formatINR } from "@/lib/utils";

export function CartClient({ initialCart }: { initialCart: SerializedCart | null }) {
  const router = useRouter();
  const [cart, setCart] = React.useState<SerializedCart | null>(initialCart);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [couponInput, setCouponInput] = React.useState(initialCart?.couponCode ?? "");
  const [couponBusy, setCouponBusy] = React.useState(false);

  const refresh = async () => {
    const { getCartPayload } = await import("@/actions/cart");
    const result = await getCartPayload();
    if (result.ok) setCart(result.data);
  };

  // Static demo builds prerender with an empty server cart; on the client the
  // cart lives in localStorage, so re-read it once on mount. (NEXT_PUBLIC_*
  // flags get inlined into client bundles; plain env vars don't.)
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    setBusyId(id);
    setCart((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)) } : prev));
    const result = await updateCartItemQuantity(id, qty);
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
    }
    await refresh();
  };

  const removeItem = async (id: string) => {
    setBusyId(id);
    const result = await removeCartItem(id);
    setBusyId(null);
    if (result.ok) {
      setCart((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev));
      toast.success("Removed from cart");
    } else {
      toast.error(result.error);
    }
  };

  const applyCouponCode = async () => {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    const result = await applyCoupon(couponInput.trim());
    setCouponBusy(false);
    if (result.ok) {
      toast.success(`Coupon ${result.data.code} applied`);
      await refresh();
    } else {
      toast.error(result.error);
    }
  };

  const clearCoupon = async () => {
    await removeCoupon();
    setCouponInput("");
    await refresh();
  };

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" />}
        title="Your cart is empty"
        description="Pick a blank, open the studio and design something wearable. Single pieces welcome."
        action={
          <Link href="/products" className="btn-gradient px-space-lg py-space-sm">
            Browse blanks <ArrowRight className="size-4" />
          </Link>
        }
      />
    );
  }

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
      <div className="lg:col-span-8 flex flex-col gap-space-sm">
        {cart.items.map((item) => (
          <div key={item.id} className="glass-panel p-space-md flex gap-space-md">
            <Link
              href={`/products/${item.productSlug}`}
              className="w-28 h-32 flex-shrink-0 rounded-2xl bg-white/[0.03] flex items-center justify-center overflow-hidden"
            >
              <GarmentMockup
                type={(garmentTypeFromCategory(item.categorySlug) ?? "tee") as GarmentType}
                color={item.colorHex}
                className="h-full w-auto"
                overlay={
                  item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-contain" draggable={false} />
                  ) : null
                }
                overlayStyle={{ top: "24%", left: "28%", width: "44%", height: "30%" }}
              />
            </Link>

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-start justify-between gap-space-sm">
                <div className="min-w-0">
                  <h3 className="font-label-lg text-label-lg text-white truncate">{item.productName}</h3>
                  <p className="font-body-sm text-body-sm text-white/50">
                    {item.colorName} · Size {item.size} · {item.side.toLowerCase()} {item.placementLabel.toLowerCase()}
                  </p>
                  {item.designId ? (
                    <span className="inline-flex items-center gap-1 mt-1 font-label-technical text-[9px] uppercase tracking-widest text-[#00E0F2]">
                      <Palette className="size-3" aria-hidden /> Custom design
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 mt-1 font-label-technical text-[9px] uppercase tracking-widest text-white/40">
                      Plain blank
                    </span>
                  )}
                </div>
                <span className="font-label-lg text-label-lg text-white whitespace-nowrap">
                  {formatINR(item.lineTotal)}
                </span>
              </div>

              <div className="mt-auto pt-space-sm flex items-center justify-between gap-space-xs flex-wrap">
                <div className="flex items-center rounded-full bg-white/[0.05] border border-white/10">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={busyId === item.id || item.quantity <= 1}
                    onClick={() => changeQty(item.id, item.quantity - 1)}
                    className="w-9 h-9 rounded-full text-white/70 hover:text-white disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-label-lg text-label-lg text-white tabular-nums">
                    {busyId === item.id ? <Spinner className="mx-auto size-3" /> : item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={busyId === item.id}
                    onClick={() => changeQty(item.id, item.quantity + 1)}
                    className="w-9 h-9 rounded-full text-white/70 hover:text-white disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-space-xs">
                  {item.designId ? (
                    <Link
                      href={`/design/${item.productId}?design=${item.designId}`}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-white/[0.06] border border-white/10 font-label-md text-label-md text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
                    >
                      <Pencil className="size-3.5" /> Edit design
                    </Link>
                  ) : (
                    <Link
                      href={`/design/${item.productId}`}
                      className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-white/[0.06] border border-white/10 font-label-md text-label-md text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
                    >
                      <Pencil className="size-3.5" /> Customize
                    </Link>
                  )}
                  <button
                    type="button"
                    aria-label="Remove item"
                    disabled={busyId === item.id}
                    onClick={() => removeItem(item.id)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#ff9d95] hover:bg-[#93000a]/40 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Price breakdown transparency */}
        <div className="glass-panel p-space-md">
          <span className="label-tech">Price transparency · first item</span>
          <ul className="flex flex-col gap-space-xs">
            {cart.items[0]?.priceBreakdown.map((line) => (
              <li key={line.label} className="flex items-start justify-between gap-space-sm font-body-md text-body-md">
                <span className="flex flex-col">
                  <span className="text-white/60">{line.label}</span>
                  {line.hint ? (
                    <span className="font-label-technical text-[9px] tracking-wide text-white/35">{line.hint}</span>
                  ) : null}
                </span>
                <span className={cn("tabular-nums", line.amount < 0 ? "text-[#7ef0a8]" : "text-white/85")}>
                  {formatINR(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-4">
        <div className="glass-panel p-space-md lg:sticky lg:top-24 flex flex-col gap-space-md">
          <div>
            <span className="font-headline-md text-headline-md font-bold text-white">Order summary</span>
            <p className="font-body-sm text-body-sm text-white/50">
              {itemCount} {itemCount === 1 ? "item" : "items"} · GST included at checkout
            </p>
          </div>

          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                aria-label="Coupon code"
                className="h-11 uppercase"
                disabled={Boolean(cart.couponCode)}
              />
              {cart.couponCode ? (
                <Button variant="outline" size="md" onClick={clearCoupon} className="h-11">
                  Remove
                </Button>
              ) : (
                <Button variant="glass" size="md" onClick={applyCouponCode} disabled={couponBusy} className="h-11">
                  <Tag className="size-4" /> {couponBusy ? "…" : "Apply"}
                </Button>
              )}
            </div>
            {cart.couponCode ? (
              <p className="font-label-technical text-[10px] uppercase tracking-widest text-[#7ef0a8]">
                Coupon {cart.couponCode} active
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-white/40">Try WELCOME10 on your first order.</p>
            )}
          </div>

          <Separator />

          <dl className="flex flex-col gap-space-xs font-body-md text-body-md">
            <Row label="Subtotal" value={formatINR(cart.totals.subtotal)} />
            {cart.totals.discount > 0 ? (
              <Row label="Discounts" value={`− ${formatINR(cart.totals.discount)}`} accent />
            ) : null}
            <Row
              label={`Shipping (${cart.shippingMethod.toLowerCase()})`}
              value={cart.totals.shipping > 0 ? formatINR(cart.totals.shipping) : "Free"}
            />
            <Row label="GST" value={formatINR(cart.totals.tax)} />
          </dl>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-label-lg text-label-lg text-white">Total</span>
            <span className="font-headline-lg text-headline-lg font-bold text-white tabular-nums">
              {formatINR(cart.totals.total)}
            </span>
          </div>

          <Button size="lg" className="h-13" onClick={() => router.push("/checkout")}>
            Proceed to checkout <ArrowRight className="size-4" />
          </Button>

          <p className="font-body-sm text-body-sm text-white/40 text-center">
            Artwork reviewed within 12 hours before printing. Free standard shipping above ₹1,499.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className={cn("tabular-nums", accent ? "text-[#7ef0a8]" : "text-white/85")}>{value}</dd>
    </div>
  );
}
