import { prisma } from "@/lib/prisma";

export function listApprovedReviews(limit = 20) {
  return prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function listPendingReviews() {
  return prisma.review.findMany({
    where: { approved: false },
    orderBy: { createdAt: "desc" },
  });
}

export function listApprovedReviewsForAdmin() {
  return prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
  });
}

export type CreateReviewInput = {
  customerName: string;
  rating: number;
  text: string;
  photoUrl?: string | null;
};

/** New reviews always start unapproved — the owner explicitly wants to
 * screen every submission before it shows up publicly. */
export async function createReview(input: CreateReviewInput) {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  return prisma.review.create({
    data: {
      customerName: input.customerName.slice(0, 80),
      rating,
      text: input.text.slice(0, 1000),
      photoUrl: input.photoUrl || null,
      approved: false,
    },
  });
}

export async function approveReview(id: string) {
  await prisma.review.update({ where: { id }, data: { approved: true } });
}

export async function rejectReview(id: string) {
  await prisma.review.delete({ where: { id } });
}
