"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/actions/auth";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: FormValues) => {
    const result = await requestPasswordReset(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSent(values.email);
  };

  if (sent) {
    return (
      <div className="glass-panel p-space-lg text-center flex flex-col items-center gap-space-sm">
        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB]/30 to-[#7C3AED]/30 border border-[#0EA5E9]/50 flex items-center justify-center">
          <MailCheck className="size-7 text-[#0284C7]" />
        </span>
        <h1 className="font-headline-lg text-headline-lg font-bold text-slate-900">Check your inbox</h1>
        <p className="font-body-md text-body-md text-slate-600">
          If an account exists for <span className="text-slate-900">{sent}</span>, a reset link is on its way. It expires
          in 1 hour.
        </p>
        <Link href="/login" className="btn-gradient mt-space-xs px-space-lg py-space-sm">
          Back to sign in <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel p-space-lg">
      <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
        Reset password
      </span>
      <h1 className="font-headline-lg text-headline-lg font-bold text-slate-900">Forgot your password?</h1>
      <p className="font-body-sm text-body-sm text-slate-600 mt-1 mb-space-md">
        Enter the email you signed up with and we&apos;ll send a secure reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm" noValidate>
        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
          {errors.email ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.email.message}</span> : null}
        </div>

        <Button type="submit" size="lg" className="h-12 mt-space-xs" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="font-body-sm text-body-sm text-slate-600 text-center mt-space-md">
        Remembered it?{" "}
        <Link href="/login" className="text-[#0891B2] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
