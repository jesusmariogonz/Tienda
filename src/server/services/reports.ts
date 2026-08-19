import { prisma } from "@/lib/prisma";

export type Granularity = "day" | "week" | "month";

export type PeriodRow = {
  period: string;
  online: number;
  pos: number;
  total: number;
};

export type TopProductRow = {
  productName: string;
  quantity: number;
  revenue: number;
};

export type ChannelSummary = {
  onlineRevenue: number;
  onlineOrders: number;
  posRevenue: number;
  posSales: number;
  totalRevenue: number;
};

/** Combined sales (online + counter) grouped by day/week/month. Online
 * revenue only counts PAID orders; POS sales are record-only and always
 * count once created. */
export async function getSalesByPeriod(
  from: Date,
  to: Date,
  granularity: Granularity,
): Promise<PeriodRow[]> {
  const rows = await prisma.$queryRaw<
    { period: Date; channel: string; total: number }[]
  >`
    SELECT date_trunc(${granularity}, "createdAt") AS period, 'online' AS channel, SUM(total)::float AS total
    FROM "Order"
    WHERE status = 'PAID' AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1
    UNION ALL
    SELECT date_trunc(${granularity}, "createdAt") AS period, 'pos' AS channel, SUM(total)::float AS total
    FROM "PosSale"
    WHERE "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1
    ORDER BY period ASC
  `;

  const byPeriod = new Map<string, PeriodRow>();
  for (const row of rows) {
    const key = row.period.toISOString();
    const entry = byPeriod.get(key) ?? { period: key, online: 0, pos: 0, total: 0 };
    if (row.channel === "online") entry.online += row.total;
    else entry.pos += row.total;
    entry.total = entry.online + entry.pos;
    byPeriod.set(key, entry);
  }

  return Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export async function getTopProducts(from: Date, to: Date, limit = 10): Promise<TopProductRow[]> {
  const rows = await prisma.$queryRaw<
    { productName: string; quantity: number; revenue: number }[]
  >`
    SELECT p.name AS "productName", SUM(x.quantity)::int AS quantity, SUM(x.quantity * x."unitPrice")::float AS revenue
    FROM (
      SELECT oi."variantId", oi.quantity, oi."unitPrice"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = 'PAID' AND o."createdAt" BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT psi."variantId", psi.quantity, psi."unitPrice"
      FROM "PosSaleItem" psi
      JOIN "PosSale" ps ON ps.id = psi."posSaleId"
      WHERE ps."createdAt" BETWEEN ${from} AND ${to}
    ) x
    JOIN "ProductVariant" v ON v.id = x."variantId"
    JOIN "Product" p ON p.id = v."productId"
    GROUP BY p.name
    ORDER BY quantity DESC
    LIMIT ${limit}
  `;
  return rows;
}

export async function getChannelSummary(from: Date, to: Date): Promise<ChannelSummary> {
  const [onlineAgg, posAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.posSale.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const onlineRevenue = Number(onlineAgg._sum.total ?? 0);
  const posRevenue = Number(posAgg._sum.total ?? 0);

  return {
    onlineRevenue,
    onlineOrders: onlineAgg._count,
    posRevenue,
    posSales: posAgg._count,
    totalRevenue: onlineRevenue + posRevenue,
  };
}
