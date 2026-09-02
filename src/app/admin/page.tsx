import Link from "next/link";
import { listLowStock } from "@/server/services/inventory";
import { getDashboardStats, listPendingOrders, listRecentActivity } from "@/server/services/dashboard";
import { getVisitStats } from "@/server/services/analytics";
import { formatPrice } from "@/lib/money";
import { dismissPendingOrderAction, dismissAllPendingOrdersAction } from "./actions";
import { MarkPaidButton } from "@/components/mark-paid-button";

const MOVEMENT_LABELS: Record<string, string> = {
  RESTOCK: "Restock",
  ONLINE_SALE: "Venta online",
  POS_SALE: "Venta mostrador",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
};

function timeAgo(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export default async function AdminDashboard() {
  const [stats, lowStock, pendingOrders, recentActivity, visits] = await Promise.all([
    getDashboardStats(),
    listLowStock(),
    listPendingOrders(),
    listRecentActivity(),
    getVisitStats(),
  ]);
  const maxDayCount = Math.max(1, ...visits.byDay.map((d) => d.count));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Resumen</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(stats.todayRevenue)}</p>
          <p className="text-sm text-zinc-500">Ventas hoy ({stats.todaySales})</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(stats.weekRevenue)}</p>
          <p className="text-sm text-zinc-500">Ventas últimos 7 días</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{stats.productCount}</p>
          <p className="text-sm text-zinc-500">Productos activos ({stats.variantCount} variantes)</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{pendingOrders.length}</p>
          <p className="text-sm text-zinc-500">Carritos abandonados</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{lowStock.length}</p>
          <p className="text-sm text-zinc-500">Variantes con stock bajo</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{stats.outOfStockCount}</p>
          <p className="text-sm text-zinc-500">Variantes agotadas</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{stats.totalUnitsInStock}</p>
          <p className="text-sm text-zinc-500">Unidades en inventario</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(stats.inventoryValue)}</p>
          <p className="text-sm text-zinc-500">Valor del inventario</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{visits.todayCount}</p>
          <p className="text-sm text-zinc-500">Visitas hoy</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{visits.weekCount}</p>
          <p className="text-sm text-zinc-500">Visitas últimos 7 días</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium">Visitas por día (7 días)</h2>
          {visits.byDay.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin visitas registradas todavía.</p>
          ) : (
            <div className="flex items-end gap-2 rounded-lg border border-zinc-200 p-4">
              {visits.byDay.map((d) => (
                <div key={d.day.toISOString()} className="flex w-10 shrink-0 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end">
                    <div
                      className="w-full rounded-t bg-sky-600"
                      style={{ height: `${Math.max(4, (d.count / maxDayCount) * 100)}%` }}
                      title={`${d.count} visitas`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {d.day.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium">Páginas más vistas (7 días)</h2>
          {visits.topPages.length === 0 ? (
            <p className="text-sm text-zinc-400">Sin visitas registradas todavía.</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {visits.topPages.map((p) => (
                <div key={p.path} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="truncate text-zinc-700">{p.path}</span>
                  <span className="shrink-0 font-medium text-zinc-900">{p.count}</span>
                </div>
              ))}
            </div>
          )}
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

      {pendingOrders.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              Carritos abandonados ({pendingOrders.length})
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/reportes/carritos-abandonados"
                className="text-xs text-zinc-600 underline"
              >
                Ver historial / exportar
              </Link>
              <form action={dismissAllPendingOrdersAction}>
                <button type="submit" className="text-xs text-red-600 underline">
                  Descartar todos
                </button>
              </form>
            </div>
          </div>
          <p className="mb-2 text-xs text-zinc-500">
            Órdenes que se iniciaron en checkout pero nunca se confirmaron pagadas.
          </p>
          <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {pendingOrders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {order.customerName ?? order.customerEmail} · {order.customerEmail}
                      {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatPrice(Number(order.total))}</p>
                    <p className="text-xs text-zinc-400">{timeAgo(order.createdAt)}</p>
                  </div>
                </div>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-600">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.variant.product.name} ({item.variant.color}/
                      {item.variant.size})
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center gap-4">
                  <MarkPaidButton orderId={order.id} />
                  <form action={dismissPendingOrderAction.bind(null, order.id)}>
                    <button type="submit" className="text-xs text-zinc-500 underline">
                      Descartar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium">Actividad reciente</h2>
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {recentActivity.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>
                  {MOVEMENT_LABELS[m.type] ?? m.type} — {m.variant.product.name} (
                  {m.variant.color}/{m.variant.size})
                </span>
                <span
                  className={`font-medium ${m.quantity < 0 ? "text-red-600" : "text-green-700"}`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
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
