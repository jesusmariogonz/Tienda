import { listCoupons } from "@/server/services/coupons";
import { formatPrice } from "@/lib/money";
import { createCouponAction, toggleCouponAction, deleteCouponAction } from "./actions";

export default async function AdminCouponsPage() {
  const coupons = await listCoupons();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Cupones</h1>

      <form action={createCouponAction} className="flex max-w-lg flex-col gap-3">
        <p className="text-sm font-medium">Nuevo cupón</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="code"
            placeholder="Código (ej. VERANO10)"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase"
          />
          <select
            name="type"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">% Porcentaje</option>
            <option value="FIXED">$ Monto fijo</option>
          </select>
          <input
            name="value"
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="minOrderAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Compra mínima (opcional)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="usageLimit"
            type="number"
            min="1"
            placeholder="Usos máximos (opcional)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="expiresAt"
            type="date"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-fit rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Crear cupón
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Descuento</th>
              <th className="px-4 py-2">Mínimo</th>
              <th className="px-4 py-2">Usos</th>
              <th className="px-4 py-2">Vence</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium">{c.code}</td>
                <td className="px-4 py-2">
                  {c.type === "PERCENTAGE"
                    ? `${Number(c.value)}%`
                    : formatPrice(Number(c.value))}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {c.minOrderAmount ? formatPrice(Number(c.minOrderAmount)) : "—"}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {c.usedCount}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("es-MX") : "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.active
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {c.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleCouponAction.bind(null, c.id, !c.active)}
                    className="inline"
                  >
                    <button type="submit" className="mr-3 text-xs underline">
                      {c.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                  <form action={deleteCouponAction.bind(null, c.id)} className="inline">
                    <button type="submit" className="text-xs text-red-600 underline">
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
