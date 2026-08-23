"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  searchVariants,
  registerPosSaleWithAlerts,
  type PosSaleItemInput,
  type PosPaymentInput,
} from "@/server/services/pos";

export async function searchVariantsAction(query: string) {
  const variants = await searchVariants(query);
  return variants.map((v) => ({
    id: v.id,
    productName: v.product.name,
    size: v.size,
    color: v.color,
    price: v.price ? Number(v.price) : Number(v.product.basePrice),
    stock: v.inventory?.quantity ?? 0,
    imageUrl: v.product.images[0]?.url ?? null,
  }));
}

export async function registerPosSaleAction(
  items: PosSaleItemInput[],
  payments: PosPaymentInput[],
  note?: string,
) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const sale = await registerPosSaleWithAlerts(
    items,
    session.user.id as string,
    payments,
    note,
  );
  revalidatePath("/admin/pos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
  return { saleNumber: sale.saleNumber, total: Number(sale.total) };
}
