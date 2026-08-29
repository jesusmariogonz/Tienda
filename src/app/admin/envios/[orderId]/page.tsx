import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderWithShipment } from "@/server/services/shipments";
import { formatPrice } from "@/lib/money";
import { skydropxConfigured, type SkydropxRate } from "@/lib/skydropx";
import {
  bookSkydropxAction,
  cancelSkydropxQuoteAction,
  quoteSkydropxAction,
  refreshSkydropxShipmentAction,
  saveShipmentAction,
} from "../actions";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "LABEL_CREATED", label: "Guía generada" },
  { value: "IN_TRANSIT", label: "En tránsito" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "RETURNED", label: "Devuelto" },
  { value: "CANCELLED", label: "Cancelado" },
];

type Address = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  references?: string;
};

export default async function AdminEnvioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ skydropx_error?: string }>;
}) {
  const { orderId } = await params;
  const { skydropx_error: skydropxError } = await searchParams;
  const order = await getOrderWithShipment(orderId);
  if (!order) notFound();

  const address = (order.shippingAddress ?? null) as Address | null;
  const canAutoGenerate = skydropxConfigured() && Boolean(address?.street);
  const pendingRates = (order.shipment?.skydropxQuoteJson as SkydropxRate[] | null) ?? null;
  const hasLabel = Boolean(order.shipment?.trackingNumber);
  const bookingInProgress = Boolean(order.shipment?.skydropxShipmentId) && !hasLabel;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/envios" className="text-xs text-zinc-500 underline">
          ← Volver a Envíos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Orden {order.orderNumber}</h1>
      </div>

      {skydropxError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo generar la guía con Skydropx: {skydropxError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Cliente</h2>
            <p className="text-sm">{order.customerName || "—"}</p>
            <p className="text-sm text-zinc-500">{order.customerEmail}</p>
            <p className="text-sm text-zinc-500">{order.customerPhone || "—"}</p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Dirección de envío</h2>
            {address ? (
              <div className="text-sm text-zinc-600">
                <p>{address.street || "—"}</p>
                <p>
                  {address.city || "—"}, {address.state || "—"} {address.zip || ""}
                </p>
                {address.references && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Referencias: {address.references}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Esta orden no tiene dirección registrada.
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Productos</h2>
            <ul className="flex flex-col gap-1 text-sm text-zinc-600">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.variant.product.name} ({item.variant.color}/
                  {item.variant.size})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-medium">Total: {formatPrice(Number(order.total))}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold">Guía automática (Skydropx)</h2>

          {!skydropxConfigured() ? (
            <p className="text-xs text-zinc-400">
              Skydropx no está conectado todavía (falta SKYDROPX_CLIENT_ID /
              SKYDROPX_CLIENT_SECRET). Mientras tanto, captura el seguimiento
              manualmente abajo.
            </p>
          ) : hasLabel ? (
            <p className="text-xs text-green-700">
              Guía generada con {order.shipment?.carrier}. Puedes editar los
              detalles abajo si algo cambió.
            </p>
          ) : bookingInProgress ? (
            <>
              <p className="text-xs text-amber-700">
                Skydropx ya cobró la guía con {order.shipment?.carrier} pero
                todavía no asigna el número de rastreo — esto es normal, solo
                tarda un poco. Actualiza el estado en unos minutos.
              </p>
              <form action={refreshSkydropxShipmentAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                >
                  Actualizar estado
                </button>
              </form>
            </>
          ) : pendingRates && pendingRates.length > 0 ? (
            <>
              {(() => {
                const selectedRateId = order.shipment?.skydropxSelectedRateId ?? null;
                // Orders placed before this field existed don't have it —
                // fall back to matching the exact amount the customer paid
                // for shipping, which still narrows it down in practice.
                const selectedRate = selectedRateId
                  ? pendingRates.find((r) => r.id === selectedRateId)
                  : pendingRates.find((r) => r.total === Number(order.shippingCost));
                const otherRates = selectedRate
                  ? pendingRates.filter((r) => r.id !== selectedRateId)
                  : pendingRates;

                function RateOption({ rate, defaultChecked }: { rate: SkydropxRate; defaultChecked: boolean }) {
                  return (
                    <label
                      key={rate.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm has-[:checked]:border-black has-[:checked]:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        name="rateId"
                        value={rate.id}
                        defaultChecked={defaultChecked}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">
                          {rate.providerDisplayName} — {rate.serviceName}
                        </span>
                        <br />
                        <span className="text-zinc-500">
                          {formatPrice(rate.total)} · {rate.days}{" "}
                          {rate.days === 1 ? "día" : "días"} ·{" "}
                          {rate.pickup ? "con recolección" : "solo sucursal"}
                        </span>
                      </span>
                    </label>
                  );
                }

                return (
                  <>
                    <p className="text-xs text-zinc-500">
                      {selectedRate
                        ? "El cliente ya eligió y pagó esta opción:"
                        : "Elige la paquetería/tarifa y cómo entregas el paquete:"}
                    </p>
                    <form action={bookSkydropxAction} className="flex flex-col gap-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <div className="flex flex-col gap-1.5">
                        {selectedRate ? (
                          <div className="rounded-md border-2 border-green-600 bg-green-50 p-0.5">
                            <RateOption rate={selectedRate} defaultChecked />
                            <p className="px-2 pb-1.5 text-[11px] font-medium text-green-700">
                              ✓ Elegida por el cliente
                            </p>
                          </div>
                        ) : (
                          pendingRates.map((rate, i) => (
                            <RateOption key={rate.id} rate={rate} defaultChecked={i === 0} />
                          ))
                        )}

                        {selectedRate && otherRates.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-zinc-500 underline">
                              Ver otras {otherRates.length} opciones (cambiar la tarifa elegida)
                            </summary>
                            <div className="mt-1.5 flex flex-col gap-1.5">
                              {otherRates.map((rate) => (
                                <RateOption key={rate.id} rate={rate} defaultChecked={false} />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>

                      <label className="mt-1 flex items-center gap-2 text-sm">
                        <input type="checkbox" name="requestPickup" defaultChecked />
                        Solicitar recolección a domicilio (si la tarifa elegida la
                        soporta; si no, deja el paquete en sucursal)
                      </label>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
                        >
                          Confirmar y generar guía
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
              <form action={cancelSkydropxQuoteAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className="text-xs text-zinc-500 underline">
                  Cancelar cotización
                </button>
              </form>
            </>
          ) : (
            <form action={quoteSkydropxAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                disabled={!canAutoGenerate}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Cotizar con Skydropx
              </button>
              {!address?.street && (
                <p className="mt-1 text-xs text-amber-600">
                  Esta orden no tiene dirección — no se puede cotizar.
                </p>
              )}
            </form>
          )}
        </div>

        <form
          action={saveShipmentAction}
          className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <h2 className="text-sm font-semibold">Seguimiento del envío</h2>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Estado</label>
            <select
              name="status"
              defaultValue={order.shipment?.status ?? "PENDING"}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Paquetería</label>
            <input
              type="text"
              name="carrier"
              defaultValue={order.shipment?.carrier ?? ""}
              placeholder="Estafeta, DHL, FedEx…"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Número de guía</label>
            <input
              type="text"
              name="trackingNumber"
              defaultValue={order.shipment?.trackingNumber ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              URL de rastreo
            </label>
            <input
              type="url"
              name="trackingUrl"
              defaultValue={order.shipment?.trackingUrl ?? ""}
              placeholder="https://…"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">URL de guía (PDF)</label>
            <input
              type="url"
              name="labelUrl"
              defaultValue={order.shipment?.labelUrl ?? ""}
              placeholder="https://…"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Costo de envío</label>
            <input
              type="number"
              step="0.01"
              name="cost"
              defaultValue={
                order.shipment?.cost !== undefined && order.shipment?.cost !== null
                  ? Number(order.shipment.cost)
                  : ""
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Notas</label>
            <textarea
              name="notes"
              defaultValue={order.shipment?.notes ?? ""}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Guardar
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
