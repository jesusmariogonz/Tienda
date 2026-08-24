import { prisma } from "@/lib/prisma";
import {
  listAllLoyverseVariants,
  pushLoyverseInventory,
  loyverseConfigured,
  loyverseStoreId,
  type LoyverseItemVariant,
} from "@/lib/loyverse";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MappingVariant = { id: string; size: string; color: string; sku: string };
export type MappingLoyverseItem = {
  itemId: string;
  itemName: string;
  variants: LoyverseItemVariant[];
};
export type MappingProduct = {
  productId: string;
  productName: string;
  variants: MappingVariant[];
  suggestedItemId: string | null;
};

/** Everything the /admin/loyverse/mapear page needs: our unmapped active
 * products/variants, the full Loyverse item catalog to pick from, and a
 * best-guess suggestion per product (matched by normalized name) so most
 * of the 1:1 linking can happen with a single click instead of hand-typing
 * SKUs into Loyverse (which most stores never bother doing anyway). */
export async function getLoyverseMappingCandidates(): Promise<{
  products: MappingProduct[];
  loyverseItems: MappingLoyverseItem[];
}> {
  const loyverseVariants = await listAllLoyverseVariants();
  const loyverseItemsMap = new Map<string, MappingLoyverseItem>();
  for (const v of loyverseVariants) {
    if (!loyverseItemsMap.has(v.itemId)) {
      loyverseItemsMap.set(v.itemId, { itemId: v.itemId, itemName: v.itemName, variants: [] });
    }
    loyverseItemsMap.get(v.itemId)!.variants.push(v);
  }
  const loyverseItems = Array.from(loyverseItemsMap.values());

  const ourVariants = await prisma.productVariant.findMany({
    where: { active: true, loyverseVariantId: null },
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }],
  });

  const byProduct = new Map<string, MappingProduct>();
  for (const v of ourVariants) {
    if (!byProduct.has(v.productId)) {
      const suggestion = loyverseItems.find(
        (li) => normalize(li.itemName) === normalize(v.product.name),
      );
      byProduct.set(v.productId, {
        productId: v.productId,
        productName: v.product.name,
        variants: [],
        suggestedItemId: suggestion?.itemId ?? null,
      });
    }
    byProduct.get(v.productId)!.variants.push({
      id: v.id,
      size: v.size,
      color: v.color,
      sku: v.sku,
    });
  }

  return { products: Array.from(byProduct.values()), loyverseItems };
}

/** Auto-pairs each of our variants under a product to a Loyverse variant
 * under the chosen item, matching on color/size text (either order,
 * accent/case-insensitive) — no writes to Loyverse, just our own
 * loyverseVariantId column. Variants that can't be confidently paired are
 * left unmapped and returned so the admin can link them by hand. */
export async function linkLoyverseItem(productId: string, loyverseItemId: string) {
  const [ourVariants, loyverseVariants] = await Promise.all([
    prisma.productVariant.findMany({
      where: { productId, active: true, loyverseVariantId: null },
    }),
    listAllLoyverseVariants(),
  ]);
  const itemVariants = loyverseVariants.filter((v) => v.itemId === loyverseItemId);
  const usedLoyverseIds = new Set(
    (
      await prisma.productVariant.findMany({
        where: { loyverseVariantId: { not: null } },
        select: { loyverseVariantId: true },
      })
    ).map((v) => v.loyverseVariantId),
  );

  let linked = 0;
  const unresolved: MappingVariant[] = [];

  for (const ours of ourVariants) {
    const wanted = normalize(`${ours.color} ${ours.size}`);
    const wantedAlt = normalize(`${ours.size} ${ours.color}`);
    const match = itemVariants.find((lv) => {
      if (usedLoyverseIds.has(lv.variantId)) return false;
      const label = normalize(lv.optionLabel ?? "");
      return label === wanted || label === wantedAlt;
    });

    if (match) {
      await prisma.productVariant.update({
        where: { id: ours.id },
        data: { loyverseVariantId: match.variantId },
      });
      usedLoyverseIds.add(match.variantId);
      linked++;
    } else {
      unresolved.push({ id: ours.id, size: ours.size, color: ours.color, sku: ours.sku });
    }
  }

  return { linked, unresolved };
}

/** Manually links one of our variants to one specific Loyverse variant —
 * used to resolve whatever linkLoyverseItem couldn't auto-pair. */
export async function linkLoyverseVariant(ourVariantId: string, loyverseVariantId: string) {
  await prisma.productVariant.update({
    where: { id: ourVariantId },
    data: { loyverseVariantId },
  });
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
