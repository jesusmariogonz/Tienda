"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { adjustInventory } from "@/server/services/inventory";

export async function adjustInventoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const variantId = formData.get("variantId") as string;
  const delta = Number(formData.get("delta"));
  const note = (formData.get("note") as string) || "Ajuste manual";
  if (!variantId || !Number.isFinite(delta) || delta === 0) return;

  await adjustInventory(variantId, delta, note, session.user.id as string);
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
}
