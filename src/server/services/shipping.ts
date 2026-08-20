import { prisma } from "@/lib/prisma";

export async function getShippingSettings() {
  const settings = await prisma.shippingSettings.findUnique({ where: { id: "default" } });
  return {
    flatRate: settings ? Number(settings.flatRate) : 0,
    freeOverAmount: settings?.freeOverAmount !== null && settings?.freeOverAmount !== undefined
      ? Number(settings.freeOverAmount)
      : null,
  };
}

export async function computeShippingCost(subtotal: number) {
  const { flatRate, freeOverAmount } = await getShippingSettings();
  if (freeOverAmount !== null && subtotal >= freeOverAmount) return 0;
  return flatRate;
}

export async function saveShippingSettings(flatRate: number, freeOverAmount: number | null) {
  return prisma.shippingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", flatRate, freeOverAmount },
    update: { flatRate, freeOverAmount },
  });
}
