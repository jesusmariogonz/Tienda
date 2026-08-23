"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart, cartTotal } from "@/store/cart";
import { useCartUI } from "@/store/cart-ui";
import { formatPrice } from "@/lib/money";
import { useCartStockSync } from "@/hooks/use-cart-stock-sync";

export function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartUI((s) => s.isOpen);
  const close = useCartUI((s) => s.close);
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);
  const stockNotes = useCartStockSync();

  const [freeOverAmount, setFreeOverAmount] = useState<number | null>(null);
  const total = cartTotal(items);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (items.length === 0) return;
    fetch(`/api/shipping-rate?subtotal=${total}`)
      .then((res) => res.json())
      .then((data) => setFreeOverAmount(data.freeOverAmount ?? null))
      .catch(() => setFreeOverAmount(null));
  }, [total, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={close}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute top-0 right-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <h2 className="text-base font-semibold">Tu carrito</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="text-xl leading-none text-zinc-500"
          >
            ×
          </button>
        </div>

        {stockNotes.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {stockNotes.map((note, i) => (
              <p key={i}>{note}</p>
            ))}
          </div>
        )}

        {items.length > 0 && freeOverAmount !== null && (
          <div className="border-b border-zinc-100 px-4 py-3">
            {total >= freeOverAmount ? (
              <p className="text-xs font-medium text-green-700">
                ¡Envío gratis desbloqueado! 🎉
              </p>
            ) : (
              <>
                <p className="mb-1.5 text-xs text-zinc-600">
                  Te faltan{" "}
                  <span className="font-medium">
                    {formatPrice(freeOverAmount - total)}
                  </span>{" "}
                  para envío gratis
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{ width: `${Math.min(100, (total / freeOverAmount) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-zinc-500">
            Tu carrito está vacío.
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-4">
            {items.map((item) => (
              <li
                key={item.variantId}
                className="flex gap-3 border-b border-zinc-100 py-4"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-zinc-100">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-zinc-500">
                    {item.color} / {item.size}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                        className="h-6 w-6 rounded-full border border-zinc-300 text-sm"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className="h-6 w-6 rounded-full border border-zinc-300 text-sm disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="self-start text-xs text-zinc-400 underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="border-t border-zinc-200 px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-base font-medium">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/checkout");
              }}
              className="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white"
            >
              Proceder a comprar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
