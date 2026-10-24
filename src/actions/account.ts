"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ok, fail, type ApiResponse } from "@/lib/response";

const profileSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")
    .optional()
    .or(z.literal("")),
});

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ApiResponse<{ saved: true }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in first.", "UNAUTHENTICATED");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name.trim(), phone: parsed.data.phone?.trim() || null },
  });
  revalidatePath("/account");
  return ok({ saved: true });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export async function changePassword(input: z.infer<typeof passwordSchema>): Promise<ApiResponse<{ changed: true }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in first.", "UNAUTHENTICATED");

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return fail("This account uses Google sign-in.", "NO_PASSWORD");

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return fail("Current password is incorrect.", "BAD_PASSWORD", { currentPassword: ["Incorrect password"] });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return ok({ changed: true });
}

const addressSchema = z.object({
  id: z.string().optional().nullable(),
  label: z.string().min(1).max(30).default("Home"),
  fullName: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid mobile number."),
  line1: z.string().min(4).max(160),
  line2: z.string().max(160).optional().nullable(),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  isDefault: z.boolean().default(false),
});

export type AddressFormData = z.infer<typeof addressSchema>;

export async function saveAddress(input: AddressFormData): Promise<ApiResponse<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in first.", "UNAUTHENTICATED");

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const data = parsed.data;
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
  }

  const { id, ...rest } = data;
  const address = id
    ? await prisma.address.update({ where: { id, userId: session.user.id }, data: rest })
    : await prisma.address.create({ data: { ...rest, userId: session.user.id } });

  revalidatePath("/account");
  return ok({ id: address.id });
}

export async function deleteAddress(id: string): Promise<ApiResponse<{ deleted: true }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in first.", "UNAUTHENTICATED");

  await prisma.address.updateMany({ where: { id, userId: session.user.id }, data: { deletedAt: new Date() } });
  revalidatePath("/account");
  return ok({ deleted: true });
}

export async function listAddresses() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return prisma.address.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}
