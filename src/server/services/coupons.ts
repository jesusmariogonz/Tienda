import { prisma } from "@/lib/prisma";

export function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export type CouponInput = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount?: number;
  usageLimit?: number;
  expiresAt?: Date;
};

export function createCoupon(input: CouponInput) {
  return prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      minOrderAmount: input.minOrderAmount,
      usageLimit: input.usageLimit,
      expiresAt: input.expiresAt,
    },
  });
}

export function toggleCoupon(id: string, active: boolean) {
  return prisma.coupon.update({ where: { id }, data: { active } });
}

export function deleteCoupon(id: string) {
  return prisma.coupon.delete({ where: { id } });
}
