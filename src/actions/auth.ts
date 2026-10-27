"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { sendEmail, passwordResetEmail, emailShell } from "@/lib/mail";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { APP_NAME } from "@/lib/constants";
import { absoluteUrl } from "@/lib/utils";

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

export async function registerUser(input: z.infer<typeof registerSchema>): Promise<ApiResponse<{ email: string }>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`register:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
  if (!limited.ok) return fail("Too many attempts. Please wait a minute.", "RATE_LIMIT");

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const email = parsed.data.email.toLowerCase().trim();
  try {
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return fail("An account with this email already exists.", "EMAIL_TAKEN", { email: ["Email already registered"] });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone?.trim() || null,
        passwordHash,
        emailVerified: null,
      },
    });

    await sendEmail({
      to: email,
      subject: `Welcome to ${APP_NAME}`,
      html: emailShell(
        "Welcome to the atelier",
        `<p style="color:#475569;">Hi ${parsed.data.name.trim().split(" ")[0]}, your account is ready. Start with a single-piece sample — no minimums, ever.</p>`,
      ),
      text: `Welcome to ${APP_NAME}, ${parsed.data.name}.`,
    });

    return ok({ email });
  } catch (error) {
    console.error("[auth] registerUser", error);
    return fail("Could not create your account. Please try again.");
  }
}

const forgotSchema = z.object({ email: z.string().email("Enter a valid email address.") });

export async function requestPasswordReset(input: z.infer<typeof forgotSchema>): Promise<ApiResponse<{ sent: boolean }>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`forgot:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
  if (!limited.ok) return fail("Too many attempts. Please wait a minute.", "RATE_LIMIT");

  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.", "VALIDATION");

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  // Always report success to avoid account enumeration.
  if (!user) return ok({ sent: true });

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = absoluteUrl(`/reset-password?token=${token}`);
  await sendEmail(passwordResetEmail({ to: email, name: user.name, resetUrl }));

  return ok({ sent: true });
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export async function resetPassword(input: z.infer<typeof resetSchema>): Promise<ApiResponse<{ reset: boolean }>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`reset:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
  if (!limited.ok) return fail("Too many attempts. Please wait a minute.", "RATE_LIMIT");

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Password must be at least 8 characters with letters and numbers.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const record = await prisma.passwordResetToken.findFirst({
      where: { token: parsed.data.token, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return fail("This reset link is invalid or has expired.", "TOKEN");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate all sessions for this user
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return ok({ reset: true });
  } catch (error) {
    console.error("[auth] resetPassword", error);
    return fail("Could not reset password. Please try again.");
  }
}
