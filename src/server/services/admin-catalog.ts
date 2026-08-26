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

// SKUs must stay ASCII-only — they get encoded as CODE128 barcodes, which
// can't represent accented characters (e.g. talla "Única"), and Loyverse/
// scanner input is plain ASCII too.
function skuSafe(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
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
  weightKg?: number | null;
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
      weightKg: input.weightKg ?? null,
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
          sku: `${slug}-${skuSafe(v.size)}-${skuSafe(v.color)}`,
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
      weightKg: input.weightKg ?? null,
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
          sku: `${product.slug}-${skuSafe(v.size)}-${skuSafe(v.color)}`,
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

/** Hard-deletes a product, except when one of its variants is referenced by
 * a past order or POS sale — the DB blocks that delete to keep sales
 * history intact (OrderItem/PosSaleItem→variant has no cascade), and would
 * otherwise crash the admin page with an unhandled FK error. In that case
 * we deactivate the product and its variants instead: it disappears from
 * the storefront and inventory the same as a delete would, but the old
 * orders/reports still resolve correctly. */
export async function deleteProduct(id: string): Promise<{ deactivatedOnly: boolean }> {
  try {
    await prisma.product.delete({ where: { id } });
    return { deactivatedOnly: false };
  } catch (err) {
    // Whatever the exact reason the hard delete failed (blocked by
    // OrderItem/PosSaleItem referencing a variant is the expected case,
    // but this is deliberately not narrowed to that one error code) —
    // deactivating is always a safe fallback, so prefer it over crashing
    // the admin page. Logged so a genuinely new failure mode is still
    // visible in Vercel's Runtime Logs.
    console.error("[admin-catalog] hard delete failed, deactivating instead:", err);

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { active: false } }),
      prisma.productVariant.updateMany({ where: { productId: id }, data: { active: false } }),
    ]);
    return { deactivatedOnly: true };
  }
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
