import { listMovements } from "@/server/services/inventory";

const TYPE_LABELS: Record<string, string> = {
  RESTOCK: "Restock",
  ONLINE_SALE: "Venta online",
  POS_SALE: "Venta mostrador",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
};

export default async function AdminMovementsPage() {
  const movements = await listMovements();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Historial de movimientos</h1>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Cantidad</th>
              <th className="px-4 py-2">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                  {m.createdAt.toLocaleString("es-MX")}
                </td>
                <td className="px-4 py-2 font-medium">
                  {m.variant.product.name}{" "}
                  <span className="text-zinc-400">
                    ({m.variant.color}/{m.variant.size})
                  </span>
                </td>
                <td className="px-4 py-2">{TYPE_LABELS[m.type] ?? m.type}</td>
                <td
                  className={`px-4 py-2 font-medium ${
                    m.quantity < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="px-4 py-2 text-zinc-500">{m.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
