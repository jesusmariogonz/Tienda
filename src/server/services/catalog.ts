import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type CatalogFilters = {
  category?: string;
  q?: string;
  sort?: "recientes" | "precio-asc" | "precio-desc";
};

export function listActiveProducts(filters: CatalogFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { category: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "precio-asc"
      ? { basePrice: "asc" }
      : filters.sort === "precio-desc"
        ? { basePrice: "desc" }
        : { createdAt: "desc" };

  return prisma.product.findMany({
    where,
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: true,
      variants: {
        where: { active: true },
        include: { inventory: true },
      },
    },
    orderBy,
  });
}

export function listCategoriesWithProducts() {
  return prisma.category.findMany({
    where: { products: { some: { active: true } } },
    orderBy: { name: "asc" },
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
