"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { linkLoyverseItem, linkLoyverseVariant } from "@/server/services/loyverse";

export async function linkLoyverseItemAction(productId: string, loyverseItemId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const result = await linkLoyverseItem(productId, loyverseItemId);
  revalidatePath("/admin/loyverse/mapear");
  revalidatePath("/admin/loyverse");
  return result;
}

export async function linkLoyverseVariantAction(ourVariantId: string, loyverseVariantId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  await linkLoyverseVariant(ourVariantId, loyverseVariantId);
  revalidatePath("/admin/loyverse/mapear");
  revalidatePath("/admin/loyverse");
}
