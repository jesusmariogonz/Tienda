import Link from "next/link";
import { listAbandonedCarts } from "@/server/services/dashboard";
import { formatPrice } from "@/lib/money";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CANCELLED: "Descartado",
};

export default async function AbandonedCartsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;

  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const carts = await listAbandonedCarts(from, to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Carritos abandonados</h1>
          <Link href="/admin/reportes" className="text-xs text-zinc-500 underline">
            ← Volver a reportes
          </Link>
        </div>
        <a
          href={`/api/admin/reportes/carritos-abandonados/export?from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Exportar a Excel
        </a>
      </div>

      <form
        action="/admin/reportes/carritos-abandonados"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
      >
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={toDateInputValue(from)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={toDateInputValue(to)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white"
        >
          Ver
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Orden</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Productos</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {carts.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-400" colSpan={6}>
                  Sin carritos abandonados en este periodo.
                </td>
              </tr>
            ) : (
              carts.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                    {order.createdAt.toLocaleString("es-MX")}
                  </td>
                  <td className="px-4 py-2 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {order.customerName ?? "—"}
                    <br />
                    <span className="text-xs text-zinc-400">
                      {order.customerEmail}
                      {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-600">
                    {order.items
                      .map(
                        (item) =>
                          `${item.quantity}× ${item.variant.product.name} (${item.variant.color}/${item.variant.size})`,
                      )
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2">{formatPrice(Number(order.total))}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
