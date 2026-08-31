"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveAboutPageContent } from "@/server/services/about-page";

export async function saveAboutPageImagesAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  await saveAboutPageContent({
    styleImageUrl: (formData.get("styleImageUrl") as string) || null,
    shippingImageUrl: (formData.get("shippingImageUrl") as string) || null,
    supportImageUrl: (formData.get("supportImageUrl") as string) || null,
    inventoryImageUrl: (formData.get("inventoryImageUrl") as string) || null,
  });

  revalidatePath("/admin/sobre-nosotros");
  revalidatePath("/sobre-nosotros");
}
