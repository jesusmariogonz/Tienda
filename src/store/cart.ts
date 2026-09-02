"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_ITEM_WEIGHT_KG } from "@/lib/config";

export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  image?: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  weightKg?: number | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          const quantity = Math.min(
            existing.quantity + item.quantity,
            item.maxQuantity,
          );
          set({
            items: items.map((i) =>
              i.variantId === item.variantId ? { ...i, quantity } : i,
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (variantId) =>
        set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      setQuantity: (variantId, quantity) =>
        set({
          items: get()
            .items.map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "tienda-cart" },
  ),
);

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartQuantity(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartWeightKg(items: CartItem[]) {
  return items.reduce(
    (sum, i) => sum + (i.weightKg ?? DEFAULT_ITEM_WEIGHT_KG) * i.quantity,
    0,
  );
}
