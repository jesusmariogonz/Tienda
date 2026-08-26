"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deleteDemoOrders } from "@/server/services/orders";

export async function deleteDemoOrdersAction() {
  const session = await auth();
  if (!session?.user) return;

  await deleteDemoOrders();
  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/inventario");
}
