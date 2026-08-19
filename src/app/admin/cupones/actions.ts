"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createCoupon, toggleCoupon, deleteCoupon } from "@/server/services/coupons";

export async function createCouponAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const code = formData.get("code") as string;
  const type = formData.get("type") as "PERCENTAGE" | "FIXED";
  const value = Number(formData.get("value"));
  const minOrderAmount = formData.get("minOrderAmount")
    ? Number(formData.get("minOrderAmount"))
    : undefined;
  const usageLimit = formData.get("usageLimit")
    ? Number(formData.get("usageLimit"))
    : undefined;
  const expiresAtRaw = formData.get("expiresAt") as string;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : undefined;

  if (!code || !type || !Number.isFinite(value)) return;

  await createCoupon({ code, type, value, minOrderAmount, usageLimit, expiresAt });
  revalidatePath("/admin/cupones");
}

export async function toggleCouponAction(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user) return;

  await toggleCoupon(id, active);
  revalidatePath("/admin/cupones");
}

export async function deleteCouponAction(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await deleteCoupon(id);
  revalidatePath("/admin/cupones");
}
