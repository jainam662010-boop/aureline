"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartStoreItem {
  id: string;
  productId: string;
  productName: string;
  slug: string;
  size: string;
  colorName: string;
  colorHex: string;
  quantity: number;
  unitPrice: number;
  thumbnailUrl?: string | null;
  garmentType?: string;
}

interface CartState {
  sessionKey: string | null;
  items: CartStoreItem[];
  couponCode: string | null;
  setSessionKey: (key: string) => void;
  setItems: (items: CartStoreItem[]) => void;
  setCoupon: (code: string | null) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: () => number;
}

/**
 * Client-side cart cache. The source of truth is the server (Prisma Cart keyed
 * by user id or an anonymous session key cookie); this store keeps optimistic
 * UI state between server action calls.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sessionKey: null,
      items: [],
      couponCode: null,
      setSessionKey: (key) => set({ sessionKey: key }),
      setItems: (items) => set({ items }),
      setCoupon: (code) => set({ couponCode: code }),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [], couponCode: null }),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "aureline-cart",
      partialize: (state) => ({ sessionKey: state.sessionKey, couponCode: state.couponCode }) as CartState,
    },
  ),
);
