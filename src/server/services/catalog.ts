import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type CatalogFilters = {
  category?: string;
  q?: string;
  sort?: "recientes" | "precio-asc" | "precio-desc";
};

// Strips accents/diacritics so "polera"/"pólera" match — Postgres
// `contains` is case-insensitive but not accent-insensitive, and search
// input from mobile keyboards especially tends to be inconsistent about
// accents.
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export async function listActiveProducts(filters: CatalogFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    active: true,
    variants: { some: { active: true } },
    ...(filters.category ? { category: { slug: filters.category } } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "precio-asc"
      ? { basePrice: "asc" }
      : filters.sort === "precio-desc"
        ? { basePrice: "desc" }
        : { createdAt: "desc" };

  const products = await prisma.product.findMany({
    where,
    include: {
      // Cards show a small swipeable preview, so we need every image, not
      // just the first — capped at 5 to keep the catalog query light.
      images: { orderBy: { position: "asc" }, take: 5 },
      category: true,
      variants: {
        where: { active: true },
        include: { inventory: true },
      },
    },
    orderBy,
  });

  if (!filters.q) return products;

  const q = normalize(filters.q);
  return products.filter(
    (p) =>
      normalize(p.name).includes(q) ||
      (p.description && normalize(p.description).includes(q)) ||
      (p.category && normalize(p.category.name).includes(q)),
  );
}

export function listWholesaleProducts() {
  return prisma.product.findMany({
    where: {
      active: true,
      wholesaleEnabled: true,
      wholesaleMinQty: { not: null },
      wholesaleDiscountPercent: { not: null },
    },
    select: { name: true, wholesaleMinQty: true, wholesaleDiscountPercent: true },
  });
}

/** Weekly discount picks — plain on/off checkbox per product (see
 * Product.discountEnabled), no date range: the owner turns it on Monday and
 * off whenever the promo ends. */
export function listDiscountedProducts() {
  return prisma.product.findMany({
    where: {
      active: true,
      discountEnabled: true,
      discountPercent: { not: null },
      variants: { some: { active: true } },
    },
    include: {
      images: { orderBy: { position: "asc" }, take: 5 },
      category: true,
      variants: { where: { active: true }, include: { inventory: true } },
    },
    orderBy: { createdAt: "desc" },
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
