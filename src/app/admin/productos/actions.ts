"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductInput,
} from "@/server/services/admin-catalog";

function parseInput(formData: FormData): ProductInput {
  const variantIds = formData.getAll("variantId") as string[];
  const sizes = formData.getAll("variantSize") as string[];
  const colors = formData.getAll("variantColor") as string[];
  const colorHexes = formData.getAll("variantColorHex") as string[];
  const quantities = formData.getAll("variantQuantity") as string[];
  const thresholds = formData.getAll("variantThreshold") as string[];

  const variants = sizes.map((size, i) => ({
    id: variantIds[i] || undefined,
    size,
    color: colors[i],
    colorHex: colorHexes[i] || undefined,
    quantity: Number(quantities[i] || 0),
    lowStockThreshold: Number(thresholds[i] || 5),
  }));

  const imageUrls = (formData.getAll("imageUrl") as string[]).filter(Boolean);

  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    basePrice: Number(formData.get("basePrice")),
    categoryName: (formData.get("categoryName") as string) || undefined,
    active: formData.get("active") === "on",
    imageUrls,
    variants,
  };
}

export async function createProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const input = parseInput(formData);
  await createProduct(input);
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

export async function updateProductAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const input = parseInput(formData);
  await updateProduct(id, input);
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  redirect("/admin/productos");
}

export async function deleteProductAction(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  await deleteProduct(id);
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}
