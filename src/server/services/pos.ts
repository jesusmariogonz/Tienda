import { prisma } from "@/lib/prisma";
import { checkLowStockAndAlert } from "./notifications";

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
export type PosPaymentInput = { method: "CASH" | "CARD" | "TRANSFER"; amount: number };

/** Registers a counter sale, decrementing the same Inventory the storefront
 * uses. This is record-only — no payment is processed here. */
export async function registerPosSale(
  items: PosSaleItemInput[],
  userId: string,
  payments: PosPaymentInput[],
  note?: string,
) {
  if (items.length === 0) throw new Error("Agrega al menos un producto");
  if (payments.length === 0) throw new Error("Indica cómo se pagó la venta");
  if (payments.some((p) => p.amount <= 0)) {
    throw new Error("Los montos de pago deben ser mayores a cero");
  }

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

    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paidTotal - total) > 0.01) {
      throw new Error(
        `Los pagos (${paidTotal.toFixed(2)}) no coinciden con el total (${total.toFixed(2)})`,
      );
    }

    const sale = await tx.posSale.create({
      data: {
        saleNumber: generateSaleNumber(),
        userId,
        total,
        note,
        items: { create: saleItemsData },
        payments: { create: payments.map((p) => ({ method: p.method, amount: p.amount })) },
      },
      include: { items: true, payments: true },
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

/** Wraps registerPosSale and checks low-stock alerts afterwards (outside
 * the transaction, since it sends email). */
export async function registerPosSaleWithAlerts(
  items: PosSaleItemInput[],
  userId: string,
  payments: PosPaymentInput[],
  note?: string,
) {
  const sale = await registerPosSale(items, userId, payments, note);

  for (const item of items) {
    await checkLowStockAndAlert(item.variantId).catch((err) =>
      console.error("[pos] failed to check low stock:", err),
    );
  }

  return sale;
}

export function listPosSales(limit = 50) {
  return prisma.posSale.findMany({
    include: {
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
