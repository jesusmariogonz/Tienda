"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/money";

type Provider = "stripe" | "mercadopago";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const total = cartTotal(items);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider>("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <main className="flex-1 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-zinc-500">Tu carrito está vacío.</p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/checkout/${provider === "stripe" ? "stripe" : "mercadopago"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customer: { email, name, phone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-xl font-semibold">Checkout</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Método de pago</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProvider("stripe")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                  provider === "stripe"
                    ? "border-black bg-black text-white"
                    : "border-zinc-300"
                }`}
              >
                Tarjeta (Stripe)
              </button>
              <button
                type="button"
                onClick={() => setProvider("mercadopago")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                  provider === "mercadopago"
                    ? "border-black bg-black text-white"
                    : "border-zinc-300"
                }`}
              >
                Mercado Pago
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Procesando…" : "Pagar"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="text-center text-sm text-zinc-500 underline"
          >
            Volver al carrito
          </button>
        </form>
      </div>
    </main>
  );
}
