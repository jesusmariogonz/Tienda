import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderWithShipment } from "@/server/services/shipments";
import { formatPrice } from "@/lib/money";
import { saveShipmentAction } from "../actions";

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
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderWithShipment(orderId);
  if (!order) notFound();

  const address = (order.shippingAddress ?? null) as Address | null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/envios" className="text-xs text-zinc-500 underline">
          ← Volver a Envíos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Orden {order.orderNumber}</h1>
      </div>

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
  );
}
