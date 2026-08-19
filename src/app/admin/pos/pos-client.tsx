"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/money";
import { searchVariantsAction, registerPosSaleAction } from "./actions";

type SearchResult = {
  id: string;
  productName: string;
  size: string;
  color: string;
  price: number;
  stock: number;
};

type TicketItem = SearchResult & { quantity: number };

export function PosClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(async () => {
      const res = await searchVariantsAction(value);
      setResults(res);
    });
  }

  function addToTicket(item: SearchResult) {
    setTicket((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
            : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function setQuantity(id: string, quantity: number) {
    setTicket((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(id: string) {
    setTicket((prev) => prev.filter((i) => i.id !== id));
  }

  const total = ticket.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleRegister() {
    setError(null);
    setMessage(null);
    try {
      const result = await registerPosSaleAction(
        ticket.map((i) => ({ variantId: i.id, quantity: i.quantity })),
        note || undefined,
      );
      setMessage(`Venta ${result.saleNumber} registrada — ${formatPrice(result.total)}`);
      setTicket([]);
      setNote("");
      setResults([]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta");
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Buscar producto por nombre o SKU…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        {isPending && <p className="text-xs text-zinc-400">Buscando…</p>}
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{r.productName}</p>
                <p className="text-xs text-zinc-500">
                  {r.color}/{r.size} · {formatPrice(r.price)} · stock {r.stock}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addToTicket(r)}
                disabled={r.stock <= 0}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-30"
              >
                Agregar
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Ticket</h2>
        {ticket.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin productos agregados.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {ticket.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-zinc-500">
                    {item.color}/{item.size} · {formatPrice(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                    className="w-14 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-600"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          type="text"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />

        <div className="flex items-center justify-between text-base font-medium">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          type="button"
          onClick={handleRegister}
          disabled={ticket.length === 0}
          className="w-full rounded-full bg-black py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          Registrar venta
        </button>
      </div>
    </div>
  );
}
