import { prisma } from "@/lib/prisma";

export function listActiveProducts() {
  return prisma.product.findMany({
    where: { active: true },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: true,
      variants: {
        where: { active: true },
        include: { inventory: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      category: true,
      variants: {
        where: { active: true },
        include: { inventory: true },
      },
    },
  });
}
