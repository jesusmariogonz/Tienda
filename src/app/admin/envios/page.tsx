import Link from "next/link";
import { listShipments } from "@/server/services/shipments";
import { formatPrice } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  LABEL_CREATED: "Guía generada",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
  RETURNED: "Devuelto",
  CANCELLED: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600",
  LABEL_CREATED: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-200 text-zinc-500",
};

export default async function AdminEnviosPage() {
  const orders = await listShipments();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Envíos</h1>
          <p className="text-xs text-zinc-500">
            Seguimiento de envíos por orden pagada. Da clic en una orden para ver la
            dirección, costo y actualizar el estado del envío.
          </p>
        </div>
        <Link
          href="/admin/envios/tarifas"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-xs"
        >
          Tarifas de envío
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Orden</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Estado envío</th>
              <th className="px-4 py-2">Paquetería</th>
              <th className="px-4 py-2">Guía</th>
              <th className="px-4 py-2">Costo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {orders.map((order) => {
              const status = order.shipment?.status ?? "PENDING";
              return (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/envios/${order.id}`}
                      className="font-medium underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">
                    {order.customerName || order.customerEmail}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.createdAt.toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.shipment?.carrier || "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.shipment?.trackingNumber || "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.shipment?.cost !== undefined && order.shipment?.cost !== null
                      ? formatPrice(Number(order.shipment.cost))
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                  Aún no hay órdenes pagadas para dar seguimiento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
