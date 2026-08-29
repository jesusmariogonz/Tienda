"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, cartTotal, cartWeightKg } from "@/store/cart";
import { formatPrice } from "@/lib/money";
import { useCartStockSync } from "@/hooks/use-cart-stock-sync";
import { STORE_PICKUP_ADDRESS } from "@/lib/config";

type Provider = "stripe" | "mercadopago" | "demo";

const DEMO_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_DEMO_CHECKOUT === "true";
const REMEMBER_KEY = "tienda-checkout-remember";

type ShippingRate = {
  id: string;
  providerDisplayName: string;
  serviceName: string;
  total: number;
  days: number;
};

type ShippingQuoteResponse =
  | { source: "flat"; cost: number }
  | { source: "skydropx"; quotationId: string; rates: ShippingRate[] };

type RememberedData = {
  email: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  colonia: string;
  references: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = cartTotal(items);
  const weightKg = cartWeightKg(items);
  const stockNotes = useCartStockSync();

  const [fulfillment, setFulfillment] = useState<"shipping" | "pickup">("shipping");
  const pickup = fulfillment === "pickup";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [colonia, setColonia] = useState("");
  const [colonias, setColonias] = useState<string[]>([]);
  const [zipLookupStatus, setZipLookupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [references, setReferences] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [provider, setProvider] = useState<Provider>("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shipping: a flat estimate as soon as the cart is known, upgraded to real
  // Skydropx rates for the customer's address once street+zip are filled —
  // the customer then picks the carrier they're actually charged for.
  const [shipping, setShipping] = useState<number | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[] | null>(null);
  const [shippingQuotationId, setShippingQuotationId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    fetch(`/api/shipping-rate?subtotal=${subtotal}`)
      .then((res) => res.json())
      .then((data) => setShipping(data.cost))
      .catch(() => setShipping(null));
  }, [subtotal, items.length]);

  useEffect(() => {
    if (items.length === 0 || zip.length !== 5 || !street.trim() || !city.trim() || !state.trim()) {
      return;
    }
    const timeout = setTimeout(() => {
      fetch("/api/shipping-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotal,
          weightKg,
          address: { street, city, state, zip, references },
        }),
      })
        .then((res) => res.json())
        .then((data: ShippingQuoteResponse) => {
          if (data.source === "skydropx" && data.rates.length > 0) {
            setShippingRates(data.rates);
            setShippingQuotationId(data.quotationId);
            setSelectedRateId(data.rates[0].id);
            setShipping(data.rates[0].total);
          } else {
            setShippingRates(null);
            setShippingQuotationId(null);
            setSelectedRateId(null);
            if (data.source === "flat") setShipping(data.cost);
          }
        })
        .catch(() => {
          setShippingRates(null);
          setShippingQuotationId(null);
          setSelectedRateId(null);
        });
    }, 700);
    return () => clearTimeout(timeout);
  }, [subtotal, weightKg, items.length, street, city, state, zip, references]);

  function selectRate(rateId: string) {
    setSelectedRateId(rateId);
    const rate = shippingRates?.find((r) => r.id === rateId);
    if (rate) setShipping(rate.total);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (!saved) return;
      const data: RememberedData = JSON.parse(saved);
      setEmail(data.email ?? "");
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setStreet(data.street ?? "");
      setCity(data.city ?? "");
      setState(data.state ?? "");
      setZip(data.zip ?? "");
      setColonia(data.colonia ?? "");
      setReferences(data.references ?? "");
      setRememberMe(true);
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  useEffect(() => {
    if (zip.length !== 5) {
      setColonias([]);
      return;
    }
    setZipLookupStatus("loading");
    const timeout = setTimeout(() => {
      fetch(`/api/postal-code/${zip}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setZipLookupStatus("error");
            return;
          }
          setCity(data.city);
          setState(data.state);
          setColonias(data.colonias ?? []);
          setColonia((prev) => (data.colonias?.includes(prev) ? prev : data.colonias?.[0] ?? ""));
          setZipLookupStatus("idle");
        })
        .catch(() => setZipLookupStatus("error"));
    }, 400);
    return () => clearTimeout(timeout);
  }, [zip]);

  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<
    { code: string; discount: number } | { error: string } | null
  >(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const discount = couponStatus && "discount" in couponStatus ? couponStatus.discount : 0;
  const total = Math.max(0, subtotal - discount) + (pickup ? 0 : (shipping ?? 0));

  if (items.length === 0) {
    return (
      <main className="flex-1 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-zinc-500">Tu carrito está vacío.</p>
      </main>
    );
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const res = await fetch(
        `/api/coupons/validate?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setCouponStatus({ error: data.error ?? "Cupón inválido" });
      } else {
        setCouponStatus({ code: couponCode.toUpperCase(), discount: data.discount });
      }
    } catch {
      setCouponStatus({ error: "No se pudo validar el cupón" });
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (rememberMe) {
      const data: RememberedData = { email, name, phone, street, city, state, zip, colonia, references };
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(data));
      } catch {
        // ignore — remember-me is a convenience, not required
      }
    } else {
      try {
        localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // ignore
      }
    }

    try {
      const res = await fetch(`/api/checkout/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          customer: {
            email,
            name,
            phone,
            address: pickup ? undefined : { street, city, state, zip, colonia, references },
          },
          couponCode:
            couponStatus && "discount" in couponStatus ? couponStatus.code : undefined,
          shipping:
            !pickup && shippingQuotationId && selectedRateId
              ? { quotationId: shippingQuotationId, rateId: selectedRateId }
              : undefined,
          pickup,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error ?? `No se pudo iniciar el pago (${res.status})`);
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 lg:grid lg:grid-cols-[1fr_420px]">
      <div className="order-2 px-4 py-6 sm:px-6 lg:order-1 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-none">
          <h1 className="mb-6 text-xl font-semibold">Checkout</h1>

          {stockNotes.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              {stockNotes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Método de entrega</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillment("shipping")}
                  className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium ${
                    fulfillment === "shipping" ? "border-black ring-1 ring-black" : "border-zinc-300"
                  }`}
                >
                  Envío a domicilio
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillment("pickup")}
                  className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium ${
                    fulfillment === "pickup" ? "border-black ring-1 ring-black" : "border-zinc-300"
                  }`}
                >
                  Recoger en tienda
                </button>
              </div>
              {pickup && (
                <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  {STORE_PICKUP_ADDRESS}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Contacto</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Correo</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Nombre</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Teléfono</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {!pickup && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Dirección de envío</h2>
              <p className="mb-3 text-xs text-amber-700">
                Asegúrate de llenar bien estos datos — son los que se usan
                para generar tu guía de envío.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Código postal</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={5}
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                  {zipLookupStatus === "loading" && (
                    <p className="mt-1 text-xs text-zinc-400">Buscando código postal…</p>
                  )}
                  {zipLookupStatus === "error" && (
                    <p className="mt-1 text-xs text-zinc-400">
                      No encontramos ese código postal — llena ciudad y estado a mano.
                    </p>
                  )}
                </div>

                {colonias.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Colonia</label>
                    <select
                      value={colonia}
                      onChange={(e) => setColonia(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {colonias.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Ciudad</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Estado</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Calle y número</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-zinc-500">
                    Referencias (opcional)
                  </label>
                  <input
                    type="text"
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    placeholder="Entre calles, color de casa, etc."
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Recuérdame — guardar mis datos en este dispositivo
                </label>
              </div>
            </section>
            )}

            {!pickup && shippingRates && shippingRates.length > 0 && (
              <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900">Paquetería</h2>
                <div className="flex flex-col gap-2">
                  {shippingRates.map((rate) => (
                    <label
                      key={rate.id}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                        selectedRateId === rate.id ? "border-black ring-1 ring-black" : "border-zinc-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingRate"
                          checked={selectedRateId === rate.id}
                          onChange={() => selectRate(rate.id)}
                        />
                        <span>
                          <span className="font-medium">{rate.providerDisplayName}</span>{" "}
                          <span className="text-zinc-500">
                            · {rate.serviceName} · {rate.days} {rate.days === 1 ? "día" : "días"}
                          </span>
                        </span>
                      </span>
                      <span className="font-medium">{formatPrice(rate.total)}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">Método de pago</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProvider("stripe")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md bg-[#635BFF] px-3 py-2.5 text-sm font-medium text-white transition-opacity ${
                    provider === "stripe" ? "ring-2 ring-offset-2 ring-[#635BFF]" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" aria-hidden>
                    <rect width="32" height="32" rx="6" fill="#fff" fillOpacity="0.15" />
                    <path
                      d="M14.6 13.3c0-.8.7-1.1 1.7-1.1 1.6 0 3.5.5 5.1 1.3V9.1c-1.7-.7-3.4-1-5.1-1-4.2 0-7 2.2-7 5.8 0 5.7 7.8 4.8 7.8 7.2 0 .9-.8 1.2-1.9 1.2-1.7 0-4-.7-5.7-1.6v4.5c1.9.8 3.8 1.1 5.7 1.1 4.3 0 7.3-2.1 7.3-5.8 0-6.2-7.9-5.1-7.9-7.2z"
                      fill="#fff"
                    />
                  </svg>
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("mercadopago")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md bg-[#FFE600] px-3 py-2.5 text-sm font-medium text-[#00263A] transition-opacity ${
                    provider === "mercadopago"
                      ? "ring-2 ring-offset-2 ring-[#FFE600]"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" aria-hidden>
                    <circle cx="16" cy="16" r="16" fill="#00263A" />
                    <path
                      d="M16 8a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm3.4 6.9-4.2 2.7a1 1 0 0 1-1.5-.9v-5.4a1 1 0 0 1 1.5-.9l4.2 2.7a1 1 0 0 1 0 1.8z"
                      fill="#FFE600"
                    />
                  </svg>
                  Mercado Pago
                </button>
              </div>
              {DEMO_CHECKOUT_ENABLED && (
                <button
                  type="button"
                  onClick={() => setProvider("demo")}
                  className={`mt-2 w-full rounded-md border border-dashed px-3 py-2 text-sm ${
                    provider === "demo"
                      ? "border-amber-600 bg-amber-50 text-amber-800"
                      : "border-zinc-300 text-zinc-500"
                  }`}
                >
                  Compra de prueba (sin cobro real)
                </button>
              )}
            </section>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-purple-700 py-3.5 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:opacity-50 lg:hidden"
            >
              {loading ? "Procesando…" : `Pagar ${formatPrice(total)}`}
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
      </div>

      <aside className="order-1 border-b border-purple-100 bg-purple-50/60 lg:order-2 lg:border-b-0 lg:border-l lg:min-h-screen">
        <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 lg:sticky lg:top-0 lg:max-w-none lg:px-8 lg:py-10">
            <h2 className="mb-4 text-sm font-semibold text-purple-950 lg:text-base">
              Tu pedido · {items.reduce((n, i) => n + i.quantity, 0)} artículo
              {items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"}
            </h2>

            <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto lg:max-h-none">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="56px"
                        quality={90}
                      />
                    )}
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-700 px-1 text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <p className="text-sm font-medium text-zinc-900">{item.productName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.color} / {item.size}
                    </p>
                  </div>
                  <p className="self-center text-sm font-medium text-zinc-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-purple-100 py-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponStatus(null);
                  }}
                  placeholder="Código de descuento"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={checkingCoupon || !couponCode.trim()}
                  className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {checkingCoupon ? "…" : "Aplicar"}
                </button>
              </div>
              {couponStatus && "error" in couponStatus && (
                <p className="mt-1 text-xs text-red-600">{couponStatus.error}</p>
              )}
              {couponStatus && "discount" in couponStatus && (
                <p className="mt-1 text-xs text-green-700">
                  Cupón aplicado: -{formatPrice(couponStatus.discount)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-purple-100 py-4">
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-700">
                  <span>Descuento</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>{pickup ? "Recoger en tienda" : "Envío"}</span>
                  <span>
                    {pickup
                      ? "Gratis"
                      : shipping === null
                        ? "Calculando…"
                        : shipping === 0
                          ? "Gratis"
                          : formatPrice(shipping)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {pickup
                    ? "Te avisamos cuando esté listo para recoger en tienda."
                    : "El envío se calcula en base a distancia, peso y medidas."}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-purple-100 pt-2 text-base font-semibold text-purple-950">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={loading}
              className="hidden w-full rounded-full bg-purple-700 py-3.5 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:opacity-50 lg:block"
            >
              {loading ? "Procesando…" : "Pagar"}
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-purple-100 pt-3 text-xs text-zinc-500">
              <span>🔒 Pago seguro</span>
              <span>📦 Envío rastreado</span>
              <span>↩️ Cambios sin complicaciones</span>
            </div>
        </div>
      </aside>
    </main>
  );
}
