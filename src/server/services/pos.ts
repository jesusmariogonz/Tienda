import { prisma } from "@/lib/prisma";

export async function searchVariants(query: string) {
  if (!query.trim()) return [];
  return prisma.productVariant.findMany({
    where: {
      active: true,
      OR: [
        { sku: { contains: query, mode: "insensitive" } },
        { product: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { product: true, inventory: true },
    take: 15,
  });
}

function generateSaleNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `POS-${stamp}-${rand}`;
}

export type PosSaleItemInput = { variantId: string; quantity: number };

/** Registers a counter sale, decrementing the same Inventory the storefront
 * uses. This is record-only — no payment is processed here. */
export async function registerPosSale(
  items: PosSaleItemInput[],
  userId: string,
  note?: string,
) {
  if (items.length === 0) throw new Error("Agrega al menos un producto");

  return prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: items.map((i) => i.variantId) } },
      include: { inventory: true, product: true },
    });

    let total = 0;
    const saleItemsData: {
      variantId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) throw new Error("Variante no encontrada");
      const available = variant.inventory?.quantity ?? 0;
      if (item.quantity < 1 || item.quantity > available) {
        throw new Error(`Stock insuficiente para ${variant.product.name}`);
      }
      const unitPrice = variant.price
        ? Number(variant.price)
        : Number(variant.product.basePrice);
      total += unitPrice * item.quantity;
      saleItemsData.push({ variantId: variant.id, quantity: item.quantity, unitPrice });
    }

    const sale = await tx.posSale.create({
      data: {
        saleNumber: generateSaleNumber(),
        userId,
        total,
        note,
        items: { create: saleItemsData },
      },
      include: { items: true },
    });

    for (const item of saleItemsData) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: "POS_SALE",
          quantity: -item.quantity,
          userId,
          posSaleId: sale.id,
          note: `Venta mostrador ${sale.saleNumber}`,
        },
      });
    }

    return sale;
  });
}

export function listPosSales(limit = 50) {
  return prisma.posSale.findMany({
    include: {
      items: { include: { variant: { include: { product: true } } } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
