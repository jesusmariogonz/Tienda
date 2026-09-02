import { prisma } from "@/lib/prisma";

export async function recordPageView(path: string) {
  await prisma.pageView.create({ data: { path: path.slice(0, 300) } });
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getVisitStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [todayCount, weekCount, byDayRaw, topPagesRaw] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.pageView.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "PageView"
      WHERE "createdAt" >= ${weekStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<{ path: string; count: bigint }[]>`
      SELECT "path", COUNT(*)::bigint AS count
      FROM "PageView"
      WHERE "createdAt" >= ${weekStart}
      GROUP BY "path"
      ORDER BY count DESC
      LIMIT 8
    `,
  ]);

  return {
    todayCount,
    weekCount,
    byDay: byDayRaw.map((r) => ({ day: r.day, count: Number(r.count) })),
    topPages: topPagesRaw.map((r) => ({ path: r.path, count: Number(r.count) })),
  };
}
