"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

/** On mount, re-checks live stock for everything in the cart and clamps
 * quantities / removes sold-out items, returning a list of human-readable
 * notes about what changed so the UI can show them. Guards against the
 * "bought it on my phone, laptop still let me pay for it" bug — a cart
 * persisted from before the item sold out otherwise stays stale. */
export function useCartStockSync() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (items.length === 0) return;

    fetch("/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: items.map((i) => i.variantId) }),
    })
      .then((res) => res.json())
      .then((data: { stock: Record<string, { quantity: number; active: boolean }> }) => {
        const found: string[] = [];
        for (const item of items) {
          const info = data.stock[item.variantId];
          const available = info?.active ? info.quantity : 0;
          if (available <= 0) {
            removeItem(item.variantId);
            found.push(
              `${item.productName} (${item.color}/${item.size}) ya no está disponible y se quitó del carrito.`,
            );
          } else if (available < item.quantity) {
            setQuantity(item.variantId, available);
            found.push(
              `${item.productName} (${item.color}/${item.size}): solo quedaban ${available}, ajustamos la cantidad.`,
            );
          }
        }
        if (found.length > 0) setNotes(found);
      })
      .catch(() => {
        // best-effort — if the check fails, checkout's own server-side
        // stock validation still catches it before charging
      });
    // Intentionally runs once per mount, not on every `items` change —
    // otherwise our own setQuantity/removeItem calls would re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return notes;
}
