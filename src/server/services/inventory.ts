import { prisma } from "@/lib/prisma";
import { checkLowStockAndAlert } from "./notifications";

export function listInventory() {
  return prisma.productVariant.findMany({
    where: { active: true },
    include: { product: true, inventory: true },
    orderBy: [{ product: { name: "asc" } }],
  });
}

export async function listLowStock() {
  const variants = await listInventory();
  return variants.filter(
    (v) => v.inventory && v.inventory.quantity <= v.inventory.lowStockThreshold,
  );
}

export async function adjustInventory(
  variantId: string,
  delta: number,
  note: string,
  userId?: string,
) {
  await prisma.$transaction([
    prisma.inventory.update({
      where: { variantId },
      data: { quantity: { increment: delta } },
    }),
    prisma.inventoryMovement.create({
      data: {
        variantId,
        type: delta >= 0 ? "RESTOCK" : "ADJUSTMENT",
        quantity: delta,
        note,
        userId,
      },
    }),
  ]);

  await checkLowStockAndAlert(variantId).catch((err) =>
    console.error("[inventory] failed to check low stock:", err),
  );
}

export function listMovements(limit = 100) {
  return prisma.inventoryMovement.findMany({
    include: {
      variant: { include: { product: true } },
      user: true,
      order: true,
      posSale: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
