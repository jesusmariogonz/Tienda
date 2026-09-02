import { prisma } from "@/lib/prisma";
import { DEFAULT_WHOLESALE_SETTINGS, type WholesaleSettings } from "@/lib/wholesale";

export async function getWholesaleSettings(): Promise<WholesaleSettings> {
  const row = await prisma.wholesaleSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_WHOLESALE_SETTINGS;
  return { minQty: row.minQty, discountPercent: Number(row.discountPercent) };
}

export async function saveWholesaleSettings(minQty: number, discountPercent: number) {
  await prisma.wholesaleSettings.upsert({
    where: { id: "default" },
    create: { id: "default", minQty, discountPercent },
    update: { minQty, discountPercent },
  });
}
