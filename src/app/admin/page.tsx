import Link from "next/link";
import { listLowStock } from "@/server/services/inventory";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [lowStock, productCount, pendingOrders] = await Promise.all([
    listLowStock(),
    prisma.product.count({ where: { active: true } }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Resumen</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{productCount}</p>
          <p className="text-sm text-zinc-500">Productos activos</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{lowStock.length}</p>
          <p className="text-sm text-zinc-500">Variantes con stock bajo</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{pendingOrders}</p>
          <p className="text-sm text-zinc-500">Órdenes pendientes de pago</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-amber-700">
            Alertas de stock bajo
          </h2>
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {lowStock.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>
                  {v.product.name} — {v.color}/{v.size}
                </span>
                <span className="font-medium text-amber-700">
                  {v.inventory?.quantity ?? 0} disponibles
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/admin/productos/nuevo"
        className="w-fit rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
      >
        Nuevo producto
      </Link>
    </div>
  );
}
