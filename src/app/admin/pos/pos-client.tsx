"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/money";
import { searchVariantsAction, registerPosSaleAction } from "./actions";

type SearchResult = {
  id: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

type TicketItem = SearchResult & { quantity: number };

const PAYMENT_METHODS = [
  { key: "CASH", label: "Efectivo" },
  { key: "CARD", label: "Tarjeta" },
  { key: "TRANSFER", label: "Transferencia" },
] as const;

type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

type CompletedSale = {
  saleNumber: string;
  total: number;
  items: TicketItem[];
  payments: { method: PaymentMethodKey; amount: number }[];
  note: string;
  date: string;
};

const PAYMENT_LABELS: Record<PaymentMethodKey, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

export function PosClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<Record<PaymentMethodKey, string>>({
    CASH: "",
    CARD: "",
    TRANSFER: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<CompletedSale | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(async () => {
      const res = await searchVariantsAction(value);
      setResults(res);
    });
  }

  // A USB/handheld barcode scanner types the code and sends Enter — if it
  // matches a SKU exactly, add it straight to the ticket instead of making
  // the cashier click "Agregar" after scanning.
  async function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !query.trim()) return;
    e.preventDefault();
    const res = await searchVariantsAction(query);
    const exact = res.find((r) => r.sku.toLowerCase() === query.trim().toLowerCase());
    if (exact) {
      if (exact.stock > 0) addToTicket(exact);
      setResults([]);
      setQuery("");
    } else {
      setResults(res);
    }
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
  const paidTotal = PAYMENT_METHODS.reduce((sum, m) => sum + (Number(payments[m.key]) || 0), 0);
  const remaining = Math.round((total - paidTotal) * 100) / 100;

  function setPaymentAmount(method: PaymentMethodKey, value: string) {
    setPayments((prev) => ({ ...prev, [method]: value }));
  }

  function payRemainingWith(method: PaymentMethodKey) {
    setPayments((prev) => ({ ...prev, [method]: Math.max(0, remaining + (Number(prev[method]) || 0)).toFixed(2) }));
  }

  async function handleRegister() {
    setError(null);
    setMessage(null);
    const paymentInputs = PAYMENT_METHODS.filter((m) => Number(payments[m.key]) > 0).map((m) => ({
      method: m.key,
      amount: Number(payments[m.key]),
    }));
    try {
      const result = await registerPosSaleAction(
        ticket.map((i) => ({ variantId: i.id, quantity: i.quantity })),
        paymentInputs,
        note || undefined,
      );
      setMessage(`Venta ${result.saleNumber} registrada — ${formatPrice(result.total)}`);
      setLastSale({
        saleNumber: result.saleNumber,
        total: result.total,
        items: ticket,
        payments: paymentInputs,
        note,
        date: new Date().toLocaleString("es-MX"),
      });
      setTicket([]);
      setNote("");
      setPayments({ CASH: "", CARD: "", TRANSFER: "" });
      setResults([]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Buscar producto por nombre o SKU… (o escanea un código)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        {isPending && <p className="text-xs text-zinc-400">Buscando…</p>}
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {r.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{r.productName}</p>
                  <p className="text-xs text-zinc-500">
                    {r.color}/{r.size} · {formatPrice(r.price)} · stock {r.stock}
                  </p>
                </div>
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

        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
          <h3 className="text-sm font-medium">Forma de pago</h3>
          {PAYMENT_METHODS.map((m) => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="w-28 text-sm text-zinc-600">{m.label}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={payments[m.key]}
                onChange={(e) => setPaymentAmount(m.key, e.target.value)}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => payRemainingWith(m.key)}
                disabled={ticket.length === 0 || remaining <= 0}
                className="text-xs text-zinc-500 underline disabled:opacity-30"
              >
                Cobrar restante
              </button>
            </div>
          ))}
          <div
            className={`text-xs ${remaining === 0 ? "text-green-700" : "text-zinc-500"}`}
          >
            {remaining > 0
              ? `Falta ${formatPrice(remaining)} por cobrar`
              : remaining < 0
                ? `Sobran ${formatPrice(-remaining)}`
                : "Pago completo"}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
            <p className="text-sm text-green-700">{message}</p>
            {lastSale && (
              <button
                type="button"
                onClick={handlePrint}
                className="shrink-0 rounded-md border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
              >
                Imprimir ticket
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleRegister}
          disabled={ticket.length === 0 || remaining !== 0}
          className="w-full rounded-full bg-black py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          Registrar venta
        </button>
      </div>

      {lastSale && (
        <div id="pos-print-ticket" className="hidden">
          <div className="ticket">
            <p className="ticket-center ticket-bold">DUPE FIT</p>
            <p className="ticket-center">Venta {lastSale.saleNumber}</p>
            <p className="ticket-center">{lastSale.date}</p>
            <hr />
            {lastSale.items.map((item) => (
              <div key={item.id} className="ticket-row">
                <span>
                  {item.productName} ({item.color}/{item.size}) x{item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <hr />
            <div className="ticket-row ticket-bold">
              <span>Total</span>
              <span>{formatPrice(lastSale.total)}</span>
            </div>
            <hr />
            {lastSale.payments.map((p) => (
              <div key={p.method} className="ticket-row">
                <span>{PAYMENT_LABELS[p.method]}</span>
                <span>{formatPrice(p.amount)}</span>
              </div>
            ))}
            {lastSale.note && (
              <>
                <hr />
                <p>{lastSale.note}</p>
              </>
            )}
            <hr />
            <p className="ticket-center">¡Gracias por tu compra!</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-print-ticket,
          #pos-print-ticket * {
            visibility: visible;
          }
          #pos-print-ticket {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
          }
          .ticket {
            font-family: monospace;
            font-size: 12px;
            padding: 4mm;
          }
          .ticket-center {
            text-align: center;
          }
          .ticket-bold {
            font-weight: bold;
          }
          .ticket-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
