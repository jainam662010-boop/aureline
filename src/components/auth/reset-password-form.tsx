"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/actions/auth";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [show, setShow] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = async (values: FormValues) => {
    const result = await resetPassword({ token, password: values.password });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDone(true);
    toast.success("Password updated — sign in with your new password.");
    setTimeout(() => router.push("/login"), 1600);
  };

  if (!token) {
    return (
      <div className="glass-panel p-space-lg text-center">
        <h1 className="font-headline-lg text-headline-lg font-bold text-slate-900">Invalid reset link</h1>
        <p className="font-body-md text-body-md text-slate-600 mt-space-xs">
          This link is missing its token. Request a fresh one below.
        </p>
        <Link href="/forgot-password" className="btn-gradient mt-space-md inline-flex px-space-lg py-space-sm">
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass-panel p-space-lg text-center flex flex-col items-center gap-space-sm">
        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#22c55e]/30 to-[#0891B2]/30 border border-[#22c55e]/50 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-[#047857]" />
        </span>
        <h1 className="font-headline-lg text-headline-lg font-bold text-slate-900">Password updated</h1>
        <p className="font-body-md text-body-md text-slate-600">Taking you to sign in…</p>
        <Link href="/login" className="btn-gradient mt-space-xs px-space-lg py-space-sm">
          Sign in now <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel p-space-lg">
      <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
        Choose a new password
      </span>
      <h1 className="font-headline-lg text-headline-lg font-bold text-slate-900">Set a new password</h1>
      <p className="font-body-sm text-body-sm text-slate-600 mt-1 mb-space-md">
        Minimum 8 characters with at least one letter and one number.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm" noValidate>
        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              placeholder="8+ characters"
              autoComplete="new-password"
              className="pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.password.message}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-space-xs">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            placeholder="Repeat it"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm ? (
            <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.confirm.message}</span>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="h-12 mt-space-xs" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
