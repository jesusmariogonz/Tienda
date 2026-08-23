import { prisma } from "@/lib/prisma";

export function listProductsForAdmin() {
  return prisma.product.findMany({
    include: {
      category: true,
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { include: { inventory: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getProductForAdmin(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { include: { inventory: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type VariantInput = {
  id?: string;
  size: string;
  color: string;
  colorHex?: string;
  colorHex2?: string;
  quantity: number;
  lowStockThreshold: number;
};

export type ProductInput = {
  name: string;
  description?: string;
  basePrice: number;
  categoryName?: string;
  active: boolean;
  imageUrls: string[];
  hoverImageUrl?: string | null;
  variants: VariantInput[];
  wholesaleEnabled?: boolean;
  wholesaleMinQty?: number | null;
  wholesaleDiscountPercent?: number | null;
};

export async function createProduct(input: ProductInput) {
  const slug = await uniqueSlug(input.name);

  let categoryId: string | undefined;
  if (input.categoryName) {
    const category = await prisma.category.upsert({
      where: { name: input.categoryName },
      update: {},
      create: { name: input.categoryName, slug: slugify(input.categoryName) },
    });
    categoryId = category.id;
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      basePrice: input.basePrice,
      active: input.active,
      categoryId,
      wholesaleEnabled: input.wholesaleEnabled ?? false,
      wholesaleMinQty: input.wholesaleMinQty ?? null,
      wholesaleDiscountPercent: input.wholesaleDiscountPercent ?? null,
      hoverImageUrl: input.hoverImageUrl ?? null,
      images: {
        create: input.imageUrls.map((url, i) => ({ url, position: i })),
      },
      variants: {
        create: input.variants.map((v) => ({
          sku: `${slug}-${v.size}-${v.color}`.toUpperCase().replace(/\s+/g, "-"),
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          colorHex2: v.colorHex2,
          inventory: {
            create: {
              quantity: v.quantity,
              lowStockThreshold: v.lowStockThreshold,
            },
          },
        })),
      },
    },
  });

  return product;
}

export async function updateProduct(id: string, input: ProductInput) {
  let categoryId: string | undefined;
  if (input.categoryName) {
    const category = await prisma.category.upsert({
      where: { name: input.categoryName },
      update: {},
      create: { name: input.categoryName, slug: slugify(input.categoryName) },
    });
    categoryId = category.id;
  }

  await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      basePrice: input.basePrice,
      active: input.active,
      categoryId,
      wholesaleEnabled: input.wholesaleEnabled ?? false,
      wholesaleMinQty: input.wholesaleMinQty ?? null,
      wholesaleDiscountPercent: input.wholesaleDiscountPercent ?? null,
      hoverImageUrl: input.hoverImageUrl ?? null,
    },
  });

  // Images: replace wholesale (simple + predictable for a single-admin CMS).
  await prisma.productImage.deleteMany({ where: { productId: id } });
  if (input.imageUrls.length > 0) {
    await prisma.productImage.createMany({
      data: input.imageUrls.map((url, i) => ({ productId: id, url, position: i })),
    });
  }

  const existingVariants = await prisma.productVariant.findMany({
    where: { productId: id },
  });

  const keptIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id));
  const toDeactivate = existingVariants.filter((v) => !keptIds.has(v.id));
  for (const variant of toDeactivate) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { active: false },
    });
  }

  const product = await prisma.product.findUniqueOrThrow({ where: { id } });

  for (const v of input.variants) {
    if (v.id) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          colorHex2: v.colorHex2 || null,
          active: true,
        },
      });
      await prisma.inventory.upsert({
        where: { variantId: v.id },
        update: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
        create: {
          variantId: v.id,
          quantity: v.quantity,
          lowStockThreshold: v.lowStockThreshold,
        },
      });
    } else {
      await prisma.productVariant.create({
        data: {
          productId: id,
          sku: `${product.slug}-${v.size}-${v.color}`.toUpperCase().replace(/\s+/g, "-"),
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          colorHex2: v.colorHex2,
          inventory: {
            create: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
          },
        },
      });
    }
  }
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
