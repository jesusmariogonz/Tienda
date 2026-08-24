import { prisma } from "@/lib/prisma";
import {
  listAllLoyverseVariants,
  pushLoyverseInventory,
  loyverseConfigured,
  loyverseStoreId,
} from "@/lib/loyverse";

/** Matches every Loyverse item variant to our ProductVariant by SKU and
 * stores the Loyverse variant_id on it, so future webhook events/pushes
 * don't need to re-resolve the mapping by SKU. Run this once after
 * connecting Loyverse, and again any time SKUs change on either side.
 * Requires that Loyverse's item variant SKUs match ours exactly — set
 * those in Loyverse's Back Office to whatever this store already
 * generated (see the variant's SKU in /admin/productos). */
export async function syncLoyverseCatalogMapping() {
  const loyverseVariants = await listAllLoyverseVariants();
  if (loyverseVariants.length === 0) {
    return { matched: 0, unmatched: 0, total: 0 };
  }

  const ourVariants = await prisma.productVariant.findMany({
    where: { sku: { in: loyverseVariants.map((v) => v.sku) } },
    select: { id: true, sku: true },
  });
  const bySku = new Map(ourVariants.map((v) => [v.sku, v.id]));

  let matched = 0;
  for (const lv of loyverseVariants) {
    const ourVariantId = bySku.get(lv.sku);
    if (!ourVariantId) continue;
    await prisma.productVariant.update({
      where: { id: ourVariantId },
      data: { loyverseVariantId: lv.variantId },
    });
    matched++;
  }

  return { matched, unmatched: loyverseVariants.length - matched, total: loyverseVariants.length };
}

/** Applies a stock level Loyverse reports (via webhook) to our own
 * Inventory — Loyverse is the source of truth for in-person sales once
 * it's set up as the physical POS, so this overwrites rather than
 * decrements. No-ops if the variant isn't mapped yet. */
export async function applyLoyverseInventoryLevel(loyverseVariantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { loyverseVariantId },
    include: { inventory: true },
  });
  if (!variant) return;

  const previous = variant.inventory?.quantity ?? 0;
  if (previous === quantity) return;

  await prisma.$transaction([
    prisma.inventory.upsert({
      where: { variantId: variant.id },
      create: { variantId: variant.id, quantity },
      update: { quantity },
    }),
    prisma.inventoryMovement.create({
      data: {
        variantId: variant.id,
        type: "LOYVERSE_SYNC",
        quantity: quantity - previous,
        note: "Sincronizado desde Loyverse",
      },
    }),
  ]);
}

/** Pushes this store's current stock for the given variants to Loyverse —
 * call after an online sale decrements our inventory, so Loyverse (used
 * for in-person selling) doesn't oversell something the website already
 * sold. Best-effort: swallows errors, never blocks the sale. */
export async function pushInventoryToLoyverse(variantIds: string[]) {
  if (!loyverseConfigured() || variantIds.length === 0) return;
  const storeId = loyverseStoreId();
  if (!storeId) return;

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, loyverseVariantId: { not: null } },
    include: { inventory: true },
  });
  if (variants.length === 0) return;

  await pushLoyverseInventory(
    variants.map((v) => ({
      variantId: v.loyverseVariantId!,
      storeId,
      quantity: v.inventory?.quantity ?? 0,
    })),
  );
}
