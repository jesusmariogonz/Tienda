"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/money";

export default function CartPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);

  const subtotal = cartTotal(items);
  const [shipping, setShipping] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    fetch(`/api/shipping-rate?subtotal=${subtotal}`)
      .then((res) => res.json())
      .then((data) => setShipping(data.cost))
      .catch(() => setShipping(null));
  }, [subtotal, items.length]);

  const total = subtotal + (shipping ?? 0);

  if (items.length === 0) {
    return (
      <main className="flex-1 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-zinc-500">Tu carrito está vacío.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
        >
          Ver catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-semibold">Carrito</h1>

        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.variantId}
              className="flex gap-4 border-b border-zinc-200 pb-4"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-zinc-100">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="80px"
                    quality={90}
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
                      onClick={() =>
                        setQuantity(item.variantId, item.quantity - 1)
                      }
                      className="h-7 w-7 rounded-full border border-zinc-300 text-sm"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(item.variantId, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.maxQuantity}
                      className="h-7 w-7 rounded-full border border-zinc-300 text-sm disabled:opacity-30"
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

        <div className="mt-6 flex flex-col gap-1 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>Envío</span>
            <span>
              {shipping === null
                ? "Calculando…"
                : shipping === 0
                  ? "Gratis"
                  : formatPrice(shipping)}
            </span>
          </div>
          <div className="flex items-center justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="mt-6 w-full rounded-full bg-black py-3.5 text-sm font-medium text-white"
        >
          Continuar al pago
        </button>
      </div>
    </main>
  );
}
