import { prisma } from "@/lib/prisma";
import {
  listAllLoyverseVariants,
  listLoyversePaymentTypes,
  listLoyverseEmployees,
  createLoyverseSaleReceipt,
  loyverseConfigured,
  loyverseStoreId,
  type LoyverseItemVariant,
} from "@/lib/loyverse";

const ONLINE_PAYMENT_TYPE_NAME = "venta en línea";

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

export type LinkedProduct = {
  productId: string;
  productName: string;
  variants: (MappingVariant & { loyverseVariantId: string; loyverseLabel: string })[];
};

/** Every product with at least one variant already linked to Loyverse —
 * lets the admin double check or undo a mistaken match, since once linked
 * a variant disappears from the pending list in getLoyverseMappingCandidates. */
export async function listLinkedLoyverseProducts(): Promise<LinkedProduct[]> {
  const [ourVariants, loyverseVariants] = await Promise.all([
    prisma.productVariant.findMany({
      where: { active: true, loyverseVariantId: { not: null } },
      include: { product: true },
      orderBy: [{ product: { name: "asc" } }],
    }),
    listAllLoyverseVariants(),
  ]);
  const loyverseById = new Map(loyverseVariants.map((v) => [v.variantId, v]));

  const byProduct = new Map<string, LinkedProduct>();
  for (const v of ourVariants) {
    if (!byProduct.has(v.productId)) {
      byProduct.set(v.productId, { productId: v.productId, productName: v.product.name, variants: [] });
    }
    const lv = loyverseById.get(v.loyverseVariantId!);
    byProduct.get(v.productId)!.variants.push({
      id: v.id,
      size: v.size,
      color: v.color,
      sku: v.sku,
      loyverseVariantId: v.loyverseVariantId!,
      loyverseLabel: lv ? `${lv.itemName}${lv.optionLabel ? ` (${lv.optionLabel})` : ""}` : "(ya no existe en Loyverse)",
    });
  }

  return Array.from(byProduct.values());
}

/** Undoes a link — the variant goes back to unmapped so it can be
 * re-matched (either auto-suggested again, or picked by hand). */
export async function unlinkLoyverseVariant(ourVariantId: string) {
  await prisma.productVariant.update({
    where: { id: ourVariantId },
    data: { loyverseVariantId: null },
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

/** Registers a paid online order as a real sale receipt in Loyverse (tagged
 * with the "Venta en línea" payment type the admin creates by hand in Back
 * Office), instead of only adjusting stock — so it shows up in Loyverse's
 * own sales reports and can be told apart from cash/card/transfer counter
 * sales. Only includes line items whose variant is actually linked to
 * Loyverse; no-ops entirely if nothing is linked, the payment type doesn't
 * exist yet, or Loyverse has no employee to attribute the sale to.
 * Best-effort — callers should catch and log, never block the order. */
export async function recordOnlineSaleInLoyverse(order: {
  orderNumber: string;
  items: { variantId: string; quantity: number; unitPrice: number | string | { toString(): string } }[];
}) {
  if (!loyverseConfigured()) return;
  const storeId = loyverseStoreId();
  if (!storeId) return;

  const linkedVariants = await prisma.productVariant.findMany({
    where: {
      id: { in: order.items.map((i) => i.variantId) },
      loyverseVariantId: { not: null },
    },
  });
  if (linkedVariants.length === 0) return;

  const [paymentTypes, employees] = await Promise.all([
    listLoyversePaymentTypes(),
    listLoyverseEmployees(),
  ]);
  const paymentType = paymentTypes.find((p) => normalize(p.name) === normalize(ONLINE_PAYMENT_TYPE_NAME));
  if (!paymentType) {
    console.error(
      `[loyverse] no "${ONLINE_PAYMENT_TYPE_NAME}" payment type found in Loyverse — create it in Back Office → Settings → Payment types to record online sales as receipts`,
    );
    return;
  }
  const employee = employees[0];
  if (!employee) {
    console.error("[loyverse] no employee found — can't attribute the sale receipt to anyone");
    return;
  }

  const byVariantId = new Map(linkedVariants.map((v) => [v.id, v]));
  const lines = order.items
    .filter((i) => byVariantId.has(i.variantId))
    .map((i) => ({
      variantId: byVariantId.get(i.variantId)!.loyverseVariantId!,
      quantity: i.quantity,
      price: Number(i.unitPrice),
    }));

  await createLoyverseSaleReceipt({
    storeId,
    employeeId: employee.id,
    paymentTypeId: paymentType.id,
    lines,
    note: `Orden ${order.orderNumber}`,
  });
}

