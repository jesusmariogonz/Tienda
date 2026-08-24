"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { syncLoyverseCatalogMapping } from "@/server/services/loyverse";

export async function syncLoyverseCatalogAction() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const result = await syncLoyverseCatalogMapping();
  revalidatePath("/admin/loyverse");
  return result;
}
