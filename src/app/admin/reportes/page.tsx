import Link from "next/link";
import { formatPrice } from "@/lib/money";
import {
  getSalesByPeriod,
  getTopProducts,
  getChannelSummary,
  getSalesByPaymentMethod,
  getSalesByCategory,
  type Granularity,
} from "@/server/services/reports";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

const RANGE_OPTIONS = [
  { key: "7d", label: "7 días", days: 7, granularity: "day" as Granularity },
  { key: "30d", label: "30 días", days: 30, granularity: "day" as Granularity },
  { key: "12w", label: "12 semanas", days: 84, granularity: "week" as Granularity },
  { key: "12m", label: "12 meses", days: 365, granularity: "month" as Granularity },
];

function formatPeriodLabel(iso: string, granularity: Granularity) {
  const date = new Date(iso);
  if (granularity === "month") {
    return date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
  }
  if (granularity === "week") {
    return `Sem. ${date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`;
  }
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from: fromParam, to: toParam } = await searchParams;

  let from: Date;
  let to: Date;
  let granularity: Granularity;
  let activeKey: string | null;
  let exportQuery: string;

  if (fromParam && toParam) {
    from = new Date(`${fromParam}T00:00:00`);
    to = new Date(`${toParam}T23:59:59`);
    const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    granularity = spanDays <= 31 ? "day" : spanDays <= 180 ? "week" : "month";
    activeKey = null;
    exportQuery = `from=${fromParam}&to=${toParam}`;
  } else {
    const option = RANGE_OPTIONS.find((r) => r.key === range) ?? RANGE_OPTIONS[1];
    to = new Date();
    from = new Date(to.getTime() - option.days * 24 * 60 * 60 * 1000);
    granularity = option.granularity;
    activeKey = option.key;
    exportQuery = `range=${option.key}`;
  }

  const [byPeriod, topProducts, summary, byPaymentMethod, byCategory] = await Promise.all([
    getSalesByPeriod(from, to, granularity),
    getTopProducts(from, to, 10),
    getChannelSummary(from, to),
    getSalesByPaymentMethod(from, to),
    getSalesByCategory(from, to),
  ]);

  const maxTotal = Math.max(1, ...byPeriod.map((p) => p.total));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full border border-zinc-200 p-1">
            {RANGE_OPTIONS.map((r) => (
              <Link
                key={r.key}
                href={`/admin/reportes?range=${r.key}`}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  r.key === activeKey ? "bg-black text-white" : "text-zinc-600"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <a
            href={`/api/admin/reportes/export?${exportQuery}`}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            Exportar a Excel
          </a>
          <Link
            href="/admin/reportes/carritos-abandonados"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            Carritos abandonados
          </Link>
        </div>
      </div>

      <form
        action="/admin/reportes"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3"
      >
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={fromParam ?? toDateInputValue(from)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={toParam ?? toDateInputValue(to)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-1.5 text-sm font-medium text-white"
        >
          Ver
        </button>
        <p className="text-xs text-zinc-400">
          Elige el mismo día en ambos campos para ver un solo día.
        </p>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(summary.totalRevenue)}</p>
          <p className="text-sm text-zinc-500">Ingresos totales</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(summary.onlineRevenue)}</p>
          <p className="text-sm text-zinc-500">Online ({summary.onlineOrders} órdenes)</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">{formatPrice(summary.posRevenue)}</p>
          <p className="text-sm text-zinc-500">Mostrador ({summary.posSales} ventas)</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-2xl font-semibold">
            {summary.totalRevenue > 0
              ? `${Math.round((summary.onlineRevenue / summary.totalRevenue) * 100)}%`
              : "—"}
          </p>
          <p className="text-sm text-zinc-500">Participación online</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Ventas combinadas por periodo</h2>
        {byPeriod.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin ventas en este periodo.</p>
        ) : (
          <div className="flex items-end gap-2 overflow-x-auto rounded-lg border border-zinc-200 p-4">
            {byPeriod.map((p) => (
              <div key={p.period} className="flex w-14 shrink-0 flex-col items-center gap-1">
                <div className="flex h-40 w-full flex-col-reverse gap-0.5">
                  <div
                    className="w-full bg-black"
                    style={{ height: `${Math.max(2, (p.online / maxTotal) * 100)}%` }}
                    title={`Online: ${formatPrice(p.online)}`}
                  />
                  <div
                    className="w-full bg-zinc-400"
                    style={{ height: `${Math.max(p.pos > 0 ? 2 : 0, (p.pos / maxTotal) * 100)}%` }}
                    title={`Mostrador: ${formatPrice(p.pos)}`}
                  />
                </div>
                <span className="text-[10px] text-zinc-500">
                  {formatPeriodLabel(p.period, granularity)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-black" /> Online
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-zinc-400" /> Mostrador
          </span>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium">Ventas por tipo de pago (mostrador)</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Tipo de pago</th>
                  <th className="px-4 py-2">Transacciones</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {byPaymentMethod.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-zinc-400" colSpan={3}>
                      Sin ventas de mostrador en este periodo.
                    </td>
                  </tr>
                ) : (
                  <>
                    {byPaymentMethod.map((p) => (
                      <tr key={p.method}>
                        <td className="px-4 py-2 font-medium">
                          {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        </td>
                        <td className="px-4 py-2">{p.transactions}</td>
                        <td className="px-4 py-2">{formatPrice(p.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2">
                        {byPaymentMethod.reduce((s, p) => s + p.transactions, 0)}
                      </td>
                      <td className="px-4 py-2">
                        {formatPrice(byPaymentMethod.reduce((s, p) => s + p.amount, 0))}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium">Ventas por categoría</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2">Unidades</th>
                  <th className="px-4 py-2">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {byCategory.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-zinc-400" colSpan={3}>
                      Sin ventas en este periodo.
                    </td>
                  </tr>
                ) : (
                  byCategory.map((c) => (
                    <tr key={c.categoryName}>
                      <td className="px-4 py-2 font-medium">{c.categoryName}</td>
                      <td className="px-4 py-2">{c.quantity}</td>
                      <td className="px-4 py-2">{formatPrice(c.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Productos más vendidos</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2">Unidades vendidas</th>
                <th className="px-4 py-2">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {topProducts.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-zinc-400" colSpan={3}>
                    Sin ventas en este periodo.
                  </td>
                </tr>
              ) : (
                topProducts.map((p) => (
                  <tr key={p.productName}>
                    <td className="px-4 py-2 font-medium">{p.productName}</td>
                    <td className="px-4 py-2">{p.quantity}</td>
                    <td className="px-4 py-2">{formatPrice(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
