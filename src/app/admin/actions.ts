"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { dismissPendingOrder, dismissAllPendingOrders } from "@/server/services/dashboard";
import { confirmOrderPaid } from "@/server/services/orders";

export async function dismissPendingOrderAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return;

  await dismissPendingOrder(orderId);
  revalidatePath("/admin");
}

/** Manual override for when a payment provider's webhook never confirms an
 * order even though the customer actually paid (verified by hand against
 * the Stripe/Mercado Pago dashboard) — runs the exact same
 * inventory-decrement + email + Loyverse flow a webhook would have. */
export async function markOrderPaidAction(orderId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };

  try {
    await confirmOrderPaid(orderId);
    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/envios");
    revalidatePath("/admin/inventario");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo confirmar la orden" };
  }
}

export async function dismissAllPendingOrdersAction() {
  const session = await auth();
  if (!session?.user) return;

  await dismissAllPendingOrders();
  revalidatePath("/admin");
}
