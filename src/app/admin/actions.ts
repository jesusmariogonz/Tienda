"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { dismissPendingOrder, dismissAllPendingOrders } from "@/server/services/dashboard";

export async function dismissPendingOrderAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return;

  await dismissPendingOrder(orderId);
  revalidatePath("/admin");
}

export async function dismissAllPendingOrdersAction() {
  const session = await auth();
  if (!session?.user) return;

  await dismissAllPendingOrders();
  revalidatePath("/admin");
}
