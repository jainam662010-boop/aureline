"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/actions/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

type FormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [showPassword, setShowPassword] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await registerUser(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // Auto sign-in so the user lands straight in their account.
    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (signInResult?.error) {
      setDone(result.data.email);
      return;
    }
    toast.success("Account created — welcome to the atelier.");
    router.push(callbackUrl);
    router.refresh();
  };

  if (done) {
    return (
      <div className="glass-panel p-space-lg text-center flex flex-col items-center gap-space-sm">
        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#22c55e]/30 to-[#00E0F2]/30 border border-[#22c55e]/50 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-[#7ef0a8]" />
        </span>
        <h1 className="font-headline-lg text-headline-lg font-bold text-white">Account created</h1>
        <p className="font-body-md text-body-md text-white/60">
          We sent a welcome note to <span className="text-white">{done}</span>. Sign in to start designing.
        </p>
        <Button asChild className="mt-space-xs h-12 px-space-lg">
          <Link href="/login">
            Continue to sign in <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-space-lg">
      <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
        Create account
      </span>
      <h1 className="font-headline-lg text-headline-lg font-bold text-white">Design without limits</h1>
      <p className="font-body-sm text-body-sm text-white/55 mt-1 mb-space-md">
        Free forever. Save unlimited designs, track production and reorder instantly.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm" noValidate>
        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Priya Sharma" autoComplete="name" {...register("name")} />
          {errors.name ? <span className="font-body-sm text-body-sm text-[#ff9d95]">{errors.name.message}</span> : null}
        </div>

        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
          {errors.email ? <span className="font-body-sm text-body-sm text-[#ff9d95]">{errors.email.message}</span> : null}
        </div>

        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="phone">Mobile (optional, for WhatsApp updates)</Label>
          <Input id="phone" inputMode="numeric" placeholder="9876543210" autoComplete="tel" {...register("phone")} />
          {errors.phone ? <span className="font-body-sm text-body-sm text-[#ff9d95]">{errors.phone.message}</span> : null}
        </div>

        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="8+ characters, letters & numbers"
              autoComplete="new-password"
              className="pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <span className="font-body-sm text-body-sm text-[#ff9d95]">{errors.password.message}</span>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="h-12 mt-space-xs" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {isSubmitting ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="font-body-sm text-body-sm text-white/55 text-center mt-space-md">
        Already registered?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-[#00E0F2] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
