"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Send, Zap, Truck, ShieldCheck, Loader2, MessageCircle, Store, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { startCheckout, verifyPayment, recordPaymentFailure } from "@/actions/orders";
import { PICKUP_STORE, PICKUP_LABEL } from "@/lib/store";
import { cn, formatINR } from "@/lib/utils";
import type { SerializedCart } from "@/actions/cart";

const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  whatsappPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter the WhatsApp number we should update you on.")
    .optional()
    .or(z.literal("")),
  fullName: z.string().min(2, "Enter your full name.").max(80),
  line1: z.string().max(160).optional().or(z.literal("")),
  line2: z.string().max(160).optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(60).optional().or(z.literal("")),
  pincode: z.string().max(6).optional().or(z.literal("")),
  shippingMethod: z.enum(["STANDARD", "EXPRESS", "PICKUP"]),
  saveAddress: z.boolean(),
  designNote: z.string().max(500).optional().or(z.literal("")),
}).superRefine((values, ctx) => {
  // Pickup (take away) needs no delivery address.
  if (values.shippingMethod === "PICKUP") return;
  const checks: [keyof typeof values, string, RegExp | number][] = [
    ["line1", "Enter your address.", 4],
    ["city", "Enter your city.", 2],
    ["state", "Enter your state.", 2],
    ["pincode", "Enter a valid 6-digit PIN code.", /^\d{6}$/],
  ];
  for (const [key, message, rule] of checks) {
    const value = String(values[key] ?? "").trim();
    const valid = rule instanceof RegExp ? rule.test(value) : value.length >= rule;
    if (!valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
    }
  }
});

type FormValues = z.infer<typeof checkoutSchema>;

interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutClient({
  cart,
  savedAddresses,
  isLoggedIn,
}: {
  cart: SerializedCart;
  savedAddresses: SavedAddress[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [paying, setPaying] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      phone: "",
      whatsappPhone: "",
      fullName: savedAddresses[0]?.fullName ?? "",
      line1: savedAddresses[0]?.line1 ?? "",
      line2: savedAddresses[0]?.line2 ?? "",
      city: savedAddresses[0]?.city ?? "",
      state: savedAddresses[0]?.state ?? "",
      pincode: savedAddresses[0]?.pincode ?? "",
      shippingMethod: cart.shippingMethod ?? "STANDARD",
      saveAddress: false,
      designNote: "",
    },
  });

  const shippingMethod = watch("shippingMethod");

  const applyAddress = (address: SavedAddress) => {
    setValue("fullName", address.fullName);
    setValue("phone", address.phone);
    setValue("line1", address.line1);
    setValue("line2", address.line2 ?? "");
    setValue("city", address.city);
    setValue("state", address.state);
    setValue("pincode", address.pincode);
  };

  const onSubmit = async (values: FormValues) => {
    setPaying(true);
    try {
      const result = await startCheckout(values);
      if (!result.ok) {
        toast.error(result.error);
        if (result.fields) {
          Object.entries(result.fields).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages[0]}`);
          });
        }
        return;
      }

      const { orderId, razorpayOrderId, razorpayKeyId, amountRupees, demoMode } = result.data;

      if (demoMode || !razorpayOrderId) {
        toast.success("Request sent! We'll confirm the details with you on WhatsApp shortly.", { duration: 6000 });
        router.push(`/orders/${orderId}?demo=1`);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        toast.error("Could not load the payment gateway. Please check your connection and try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        name: "Aureline Atelier",
        description: `${cart.items.length} custom item(s)`,
        order_id: razorpayOrderId,
        prefill: {
          name: values.fullName,
          email: values.email,
          contact: `+91${values.phone}`,
        },
        theme: { color: "#FF0D7B", backdrop_color: "#08080a" },
        modal: {
          ondismiss: async () => {
            await recordPaymentFailure({ razorpay_order_id: razorpayOrderId, description: "Customer cancelled" });
            toast.info("Payment cancelled — your order is saved, you can retry anytime.");
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verified = await verifyPayment(response);
          if (verified.ok) {
            toast.success("Payment successful! Your order is confirmed.");
            router.push(`/orders/${verified.data.orderId}?success=1`);
          } else {
            toast.error(verified.error);
            router.push(`/orders/${orderId}?payment=failed`);
          }
        },
      });
      rzp.open();
    } finally {
      setPaying(false);
    }
  };

  const busy = isSubmitting || paying;

  if (cart.items.length === 0) {
    return (
      <div className="glass-panel p-space-lg text-center">
        <p className="font-headline-md text-headline-md text-white">Your cart is empty</p>
        <Link href="/products" className="btn-gradient mt-space-md inline-flex px-space-lg py-space-sm">
          Browse blanks
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
      <div className="lg:col-span-7 flex flex-col gap-space-md">
        {/* Contact */}
        <section className="glass-panel p-space-md flex flex-col gap-space-md">
          <h2 className="font-headline-md text-headline-md font-semibold text-white">Contact details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-space-xs">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-space-xs">
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" inputMode="numeric" placeholder="9876543210" {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="flex flex-col gap-space-xs sm:col-span-2">
              <Label htmlFor="whatsappPhone">WhatsApp number for updates</Label>
              <div className="flex items-center gap-space-xs">
                <span className="flex-shrink-0 flex size-11 items-center justify-center rounded-2xl bg-[#22c55e]/12 border border-[#22c55e]/30 text-[#7ef0a8]">
                  <MessageCircle className="size-4" />
                </span>
                <Input
                  id="whatsappPhone"
                  inputMode="numeric"
                  placeholder="9876543210"
                  {...register("whatsappPhone")}
                  className="flex-1"
                />
              </div>
              <p className="font-body-sm text-body-sm text-white/45">
                We&apos;ll message you here the moment your request is accepted. Leave blank to use your mobile number.
              </p>
              <FieldError message={errors.whatsappPhone?.message} />
            </div>
          </div>
          {!isLoggedIn ? (
            <p className="font-body-sm text-body-sm text-white/40">
              Guest checkout works fine —{" "}
              <Link href="/login?callbackUrl=/checkout" className="text-[#00E0F2] hover:underline">
                sign in
              </Link>{" "}
              to track orders and save designs.
            </p>
          ) : null}
        </section>

        {/* Shipping address */}
        <section className="glass-panel p-space-md flex flex-col gap-space-md">
          <h2 className="font-headline-md text-headline-md font-semibold text-white">
            {shippingMethod === "PICKUP" ? "Pickup contact" : "Shipping address"}
          </h2>

          {shippingMethod === "PICKUP" ? (
            <p className="font-body-sm text-body-sm text-white/60 leading-relaxed">
              Collect from the Aureline counter at {PICKUP_LABEL}. We only need your contact details below; the
              pickup-ready WhatsApp will tell you when to come.
            </p>
          ) : null}

          {savedAddresses.length > 0 && shippingMethod !== "PICKUP" ? (
            <div className="flex flex-wrap gap-space-xs">
              {savedAddresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => applyAddress(address)}
                  className="px-space-sm py-space-xs rounded-full bg-white/[0.05] border border-white/10 font-label-md text-label-md text-white/80 hover:border-white/30 hover:text-white transition-all"
                >
                  {address.label} · {address.city}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-space-xs sm:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" placeholder="Priya Sharma" {...register("fullName")} />
              <FieldError message={errors.fullName?.message} />
            </div>
            {shippingMethod !== "PICKUP" ? (
              <>
                <div className="flex flex-col gap-space-xs sm:col-span-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input id="line1" placeholder="Flat / House no., Street" {...register("line1")} />
                  <FieldError message={errors.line1?.message} />
                </div>
                <div className="flex flex-col gap-space-xs sm:col-span-2">
                  <Label htmlFor="line2">Address line 2 (optional)</Label>
                  <Input id="line2" placeholder="Landmark, Area" {...register("line2")} />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Bengaluru" {...register("city")} />
                  <FieldError message={errors.city?.message} />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="Karnataka" {...register("state")} />
                  <FieldError message={errors.state?.message} />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <Label htmlFor="pincode">PIN code</Label>
                  <Input id="pincode" inputMode="numeric" placeholder="560001" {...register("pincode")} />
                  <FieldError message={errors.pincode?.message} />
                </div>
              </>
            ) : null}
            {isLoggedIn ? (
              <label className="flex items-end gap-space-xs pb-2 cursor-pointer">
                <input type="checkbox" className="accent-[#FF3B30] w-4 h-4" {...register("saveAddress")} />
                <span className="font-body-sm text-body-sm text-white/70">Save to my addresses</span>
              </label>
            ) : null}
          </div>
        </section>

        {/* Delivery method */}
        <section className="glass-panel p-space-md flex flex-col gap-space-md">
          <h2 className="font-headline-md text-headline-md font-semibold text-white">Delivery method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            <DeliveryOption
              active={shippingMethod === "STANDARD"}
              onClick={() => setValue("shippingMethod", "STANDARD")}
              icon={<Truck className="size-5" />}
              title="Standard"
              subtitle="5–7 working days · free above ₹1,499"
            />
            <DeliveryOption
              active={shippingMethod === "EXPRESS"}
              onClick={() => setValue("shippingMethod", "EXPRESS")}
              icon={<Zap className="size-5" />}
              title="Express air"
              subtitle="2–3 working days · metro cities"
            />
            <DeliveryOption
              active={shippingMethod === "PICKUP"}
              onClick={() => setValue("shippingMethod", "PICKUP")}
              icon={<Store className="size-5" />}
              title="Take away from store"
              subtitle={`Pick up in Pune · ${PICKUP_STORE.mall}`}
            />
          </div>

          {shippingMethod === "PICKUP" ? (
            <div className="rounded-2xl border border-[#22c55e]/35 bg-[#22c55e]/10 p-space-sm">
              <p className="font-label-lg text-label-lg text-[#7ef0a8] flex items-center gap-space-xs">
                <MapPin className="size-4" /> Free collection in Pune
              </p>
              <p className="font-body-sm text-body-sm text-white/70 mt-1 leading-relaxed">
                Collect your order from the {PICKUP_STORE.name} at {PICKUP_STORE.mall}, {PICKUP_STORE.area},{" "}
                {PICKUP_STORE.city}. We&apos;ll message you on WhatsApp the moment it&apos;s packed and ready, and hold
                it for 7 days. No address needed below.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="designNote">Note for the artwork team (optional)</Label>
            <Textarea id="designNote" placeholder="Placement tweaks, colour preferences, deadline…" {...register("designNote")} />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5">
        <div className="glass-panel p-space-md lg:sticky lg:top-24 flex flex-col gap-space-md">
          <h2 className="font-headline-md text-headline-md font-semibold text-white">Order summary</h2>

          <ul className="flex flex-col gap-space-sm max-h-72 overflow-y-auto hide-scrollbar">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-space-sm">
                <span className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-white truncate">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-body-sm text-body-sm text-white/45 truncate">
                    {item.colorName} · {item.size} · {item.side.toLowerCase()}
                  </span>
                </span>
                <span className="font-label-md text-label-md text-white/85 tabular-nums whitespace-nowrap">
                  {formatINR(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <dl className="flex flex-col gap-space-xs font-body-md text-body-md">
            <div className="flex justify-between">
              <dt className="text-white/60">Subtotal</dt>
              <dd className="tabular-nums text-white/85">{formatINR(cart.totals.subtotal)}</dd>
            </div>
            {cart.totals.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-white/60">Discounts</dt>
                <dd className="tabular-nums text-[#7ef0a8]">− {formatINR(cart.totals.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-white/60">Shipping</dt>
              <dd className="tabular-nums text-white/85">
                {cart.totals.shipping > 0 ? formatINR(cart.totals.shipping) : "Free"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">GST</dt>
              <dd className="tabular-nums text-white/85">{formatINR(cart.totals.tax)}</dd>
            </div>
          </dl>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-label-lg text-label-lg text-white">Total payable</span>
            <span className="font-headline-lg text-headline-lg font-bold text-white tabular-nums">
              {formatINR(cart.totals.total)}
            </span>
          </div>

          <Button type="submit" size="lg" className="h-13" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {busy ? "Sending request…" : `Request now · ${formatINR(cart.totals.total)}`}
          </Button>

          <p className="font-body-sm text-body-sm text-white/55 leading-relaxed">
            Sending a request is free. Our team reviews your items and messages you on WhatsApp with the final
            confirmation before any payment is taken.
          </p>

          <p className="flex items-center gap-space-xs font-body-sm text-body-sm text-white/45">
            <ShieldCheck className="size-4 text-[#7ef0a8] flex-shrink-0" />
            Payments processed securely by Razorpay. We never store card details.
          </p>
        </div>
      </aside>
    </form>
  );
}

function DeliveryOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-space-sm p-space-sm rounded-2xl border text-left transition-all",
        active ? "border-[#FF0D7B]/70 bg-white/[0.08]" : "border-white/10 bg-white/[0.03] hover:border-white/30",
      )}
    >
      <span className={cn("flex-shrink-0", active ? "text-[#FF0D7B]" : "text-white/50")}>{icon}</span>
      <span className="flex flex-col">
        <span className="font-label-lg text-label-lg text-white">{title}</span>
        <span className="font-body-sm text-body-sm text-white/50">{subtitle}</span>
      </span>
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="font-body-sm text-body-sm text-[#ff9d95]">{message}</span>;
}
