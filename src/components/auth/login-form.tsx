"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormValues) => {
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      toast.error("Incorrect email or password.");
      return;
    }
    toast.success("Welcome back.");
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="glass-panel p-space-lg">
      <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
        Sign in
      </span>
      <h1 className="font-headline-lg text-headline-lg font-bold text-white">Good to see you again</h1>
      <p className="font-body-sm text-body-sm text-white/55 mt-1 mb-space-md">
        Track orders, reopen saved designs and reorder in one tap.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm" noValidate>
        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
          {errors.email ? <span className="font-body-sm text-body-sm text-[#ff9d95]">{errors.email.message}</span> : null}
        </div>

        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="font-body-sm text-body-sm text-[#00E0F2] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
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
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="font-body-sm text-body-sm text-white/55 text-center mt-space-md">
        New here?{" "}
        <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-[#00E0F2] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
