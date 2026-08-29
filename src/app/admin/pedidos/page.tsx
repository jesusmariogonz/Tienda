import { listRecentPaidOrders } from "@/server/services/orders";
import { formatPrice } from "@/lib/money";
import { ResendConfirmationButton } from "@/components/resend-confirmation-button";

export default async function AdminOrdersPage() {
  const orders = await listRecentPaidOrders();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Últimas {orders.length} órdenes pagadas. Si a un cliente no le
          llegó su correo de confirmación (p. ej. por un problema puntual de
          Resend), reenvíalo aquí sin tener que pedirnos ayuda.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Orden</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Confirmación</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {orders.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-zinc-400" colSpan={6}>
                  Todavía no hay órdenes pagadas.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-2 font-medium">
                    #DF-{order.orderSeq.toString().padStart(5, "0")}
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{order.customerEmail}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.createdAt.toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2">{formatPrice(Number(order.total))}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {order.confirmationSentAt
                      ? order.confirmationSentAt.toLocaleString("es-MX")
                      : "No enviada"}
                  </td>
                  <td className="px-4 py-2">
                    <ResendConfirmationButton orderId={order.id} />
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
