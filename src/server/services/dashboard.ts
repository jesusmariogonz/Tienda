import { prisma } from "@/lib/prisma";

export function listPendingOrders() {
  return prisma.order.findMany({
    where: { status: "PENDING" },
    include: { items: { include: { variant: { include: { product: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    productCount,
    variantCount,
    outOfStockCount,
    todayOnline,
    todayPos,
    weekOnline,
    weekPos,
    variants,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true } }),
    prisma.inventory.count({ where: { quantity: 0 } }),
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.posSale.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: weekStart } },
      _sum: { total: true },
    }),
    prisma.posSale.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum: { total: true },
    }),
    prisma.productVariant.findMany({
      where: { active: true },
      include: { inventory: true, product: true },
    }),
  ]);

  const inventoryValue = variants.reduce((sum, v) => {
    const price = v.price ? Number(v.price) : Number(v.product.basePrice);
    return sum + price * (v.inventory?.quantity ?? 0);
  }, 0);
  const totalUnitsInStock = variants.reduce(
    (sum, v) => sum + (v.inventory?.quantity ?? 0),
    0,
  );

  const todayRevenue = Number(todayOnline._sum.total ?? 0) + Number(todayPos._sum.total ?? 0);
  const todaySales = todayOnline._count + todayPos._count;
  const weekRevenue = Number(weekOnline._sum.total ?? 0) + Number(weekPos._sum.total ?? 0);

  return {
    productCount,
    variantCount,
    outOfStockCount,
    inventoryValue,
    totalUnitsInStock,
    todayRevenue,
    todaySales,
    weekRevenue,
  };
}

export function listRecentActivity(limit = 8) {
  return prisma.inventoryMovement.findMany({
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
