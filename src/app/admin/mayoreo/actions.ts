"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveWholesaleSettings } from "@/server/services/wholesale-settings";

export async function saveWholesaleSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const minQty = Number(formData.get("minQty"));
  const discountPercent = Number(formData.get("discountPercent"));
  if (!Number.isFinite(minQty) || minQty < 1) return;
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90) return;

  await saveWholesaleSettings(minQty, discountPercent);
  revalidatePath("/admin/mayoreo");
}
