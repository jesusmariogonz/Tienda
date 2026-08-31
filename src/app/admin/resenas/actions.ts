"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveReview, rejectReview } from "@/server/services/reviews";

export async function approveReviewAction(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await approveReview(id);
  revalidatePath("/admin/resenas");
  revalidatePath("/");
  revalidatePath("/sobre-nosotros");
}

export async function rejectReviewAction(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await rejectReview(id);
  revalidatePath("/admin/resenas");
  revalidatePath("/");
  revalidatePath("/sobre-nosotros");
}
