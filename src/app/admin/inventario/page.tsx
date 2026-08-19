import { listInventory } from "@/server/services/inventory";
import { adjustInventoryAction } from "./actions";

export default async function AdminInventoryPage() {
  const variants = await listInventory();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventario</h1>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Variante</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Alerta en</th>
              <th className="px-4 py-2">Ajustar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {variants.map((v) => {
              const low =
                v.inventory && v.inventory.quantity <= v.inventory.lowStockThreshold;
              return (
                <tr key={v.id} className={low ? "bg-amber-50" : undefined}>
                  <td className="px-4 py-2 font-medium">{v.product.name}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {v.color} / {v.size}
                  </td>
                  <td
                    className={`px-4 py-2 font-medium ${low ? "text-amber-700" : ""}`}
                  >
                    {v.inventory?.quantity ?? 0}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {v.inventory?.lowStockThreshold ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <form
                      action={adjustInventoryAction}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="variantId" value={v.id} />
                      <input
                        type="number"
                        name="delta"
                        placeholder="+/-"
                        required
                        className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        name="note"
                        placeholder="Nota"
                        className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
                      >
                        Aplicar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
