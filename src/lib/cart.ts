import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { Cart, CartItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const CART_COOKIE = "aureline_sid";

export type CartWithItems = Cart & {
  items: (CartItem & {
    product: Prisma.ProductGetPayload<{ include: { category: true } }>;
    variant: Prisma.ProductVariantGetPayload<Record<string, never>>;
    design: { id: string; name: string; thumbnailUrl: string | null } | null;
  })[];
};

/** Stable anonymous id for guest carts. */
export async function getOrCreateSessionKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing && /^[a-zA-Z0-9-]{16,64}$/.test(existing)) return existing;
  const key = randomUUID().replace(/-/g, "");
  store.set(CART_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return key;
}

export async function currentCartKey(): Promise<{ userId: string | null; sessionKey: string | null }> {
  const session = await auth();
  if (session?.user?.id) return { userId: session.user.id, sessionKey: null };
  const store = await cookies();
  const key = store.get(CART_COOKIE)?.value;
  return { userId: null, sessionKey: key ?? null };
}

const cartInclude = {
  items: {
    include: {
      product: { include: { category: true } },
      variant: true,
      design: { select: { id: true, name: true, thumbnailUrl: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.CartInclude;

export async function getOrCreateCart(): Promise<CartWithItems> {
  const { userId, sessionKey } = await currentCartKey();
  const key = sessionKey ?? (await getOrCreateSessionKey());

  const existing = await prisma.cart.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(sessionKey || !userId ? [{ sessionKey: key }] : []),
      ],
    },
    include: cartInclude,
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    // Merge: if the user just signed in, attach their guest cart to the account.
    if (userId && !existing.userId) {
      await prisma.cart.update({ where: { id: existing.id }, data: { userId, sessionKey: null } });
      existing.userId = userId;
    }
    return existing;
  }

  return (await prisma.cart.create({
    data: { userId, sessionKey: userId ? null : key },
    include: cartInclude,
  })) as CartWithItems;
}

export async function findCart(): Promise<CartWithItems | null> {
  const { userId, sessionKey } = await currentCartKey();
  if (!userId && !sessionKey) return null;
  return prisma.cart.findFirst({
    where: {
      deletedAt: null,
      OR: [...(userId ? [{ userId }] : []), ...(sessionKey ? [{ sessionKey }] : [])],
    },
    include: cartInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export function cartItemCount(cart: CartWithItems | null): number {
  return cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
}
