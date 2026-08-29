// Loyverse API client. Auth is a single long-lived Access Token (Back
// Office → Settings → Access Tokens) — no OAuth dance like Skydropx, just
// a Bearer header. No-ops (returns null) when the token isn't set, same
// pattern as the other integrations in this file's siblings.
//
// Docs: https://developer.loyverse.com/docs/ — default rate limit is ~50
// requests/minute, well above anything a single small store needs here.

const API_URL = "https://api.loyverse.com/v1.0";

function isConfigured() {
  return Boolean(process.env.LOYVERSE_API_TOKEN && process.env.LOYVERSE_STORE_ID);
}

async function loyverseFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOYVERSE_API_TOKEN}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Loyverse ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

export type LoyverseItemVariant = {
  variantId: string;
  itemId: string;
  itemName: string;
  sku: string;
  optionLabel: string | null;
};

/** Paginates through every item in the Loyverse catalog, flattened to one
 * entry per variant (Loyverse nests variants under items). Included
 * whether or not it has a SKU set — most stores never bother typing SKUs
 * into Loyverse, so matching can't depend on that field existing. */
export async function listAllLoyverseVariants(): Promise<LoyverseItemVariant[]> {
  if (!isConfigured()) return [];

  const variants: LoyverseItemVariant[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ limit: "250" });
    if (cursor) query.set("cursor", cursor);
    const page = await loyverseFetch(`/items?${query.toString()}`);

    for (const item of page.items ?? []) {
      for (const v of item.variants ?? []) {
        const optionLabel = [v.option1_value, v.option2_value, v.option3_value]
          .filter(Boolean)
          .join("/");
        variants.push({
          variantId: v.variant_id,
          itemId: item.id,
          itemName: item.item_name,
          sku: v.sku ?? "",
          optionLabel: optionLabel || null,
        });
      }
    }
    cursor = page.cursor || undefined;
  } while (cursor);

  return variants;
}

export type LoyverseInventoryLevel = { variantId: string; storeId: string; quantity: number };

/** Pushes stock levels to Loyverse (POST /inventory) — used after an
 * online sale, so Loyverse (used for in-person selling) doesn't oversell
 * something that already went out the door via the website. Best-effort:
 * callers should catch and log, never block the sale on this. */
export async function pushLoyverseInventory(updates: LoyverseInventoryLevel[]) {
  if (!isConfigured() || updates.length === 0) return;

  await loyverseFetch("/inventory", {
    method: "POST",
    body: JSON.stringify({
      inventory_levels: updates.map((u) => ({
        variant_id: u.variantId,
        store_id: u.storeId,
        stock_after: u.quantity,
      })),
    }),
  });
}

export type LoyversePaymentType = { id: string; name: string };

/** Payment types are managed by the merchant in Loyverse's Back Office
 * (Settings → Payment types) — there's no API to create one, so the admin
 * creates e.g. "Venta en línea" by hand and this just looks it up by name
 * so an online sale can be tagged with it. */
export async function listLoyversePaymentTypes(): Promise<LoyversePaymentType[]> {
  if (!isConfigured()) return [];
  const data = await loyverseFetch("/payment_types");
  return (data.payment_types ?? []).map((p: { id: string; name: string }) => ({
    id: p.id,
    name: p.name,
  }));
}

export type LoyverseEmployee = { id: string; name: string };

export async function listLoyverseEmployees(): Promise<LoyverseEmployee[]> {
  if (!isConfigured()) return [];
  const data = await loyverseFetch("/employees");
  return (data.employees ?? []).map((e: { id: string; name: string }) => ({
    id: e.id,
    name: e.name,
  }));
}

export type LoyverseReceiptLine = { variantId: string; quantity: number; price: number };

/** Records a real sale receipt in Loyverse (POST /receipts) instead of just
 * silently adjusting stock — so an online order shows up in Loyverse's own
 * sales reports (with its own payment type, e.g. "Venta en línea") instead
 * of looking like the item just vanished from inventory. Loyverse decrements
 * its own stock for the sale automatically, so callers should NOT also call
 * pushLoyverseInventory for these same lines.
 *
 * Field names here are a best guess from Loyverse's public API docs (this
 * sandbox can't reach developer.loyverse.com to verify live) — logged
 * end-to-end like the webhook route so a mismatch can be diagnosed from
 * Vercel's Runtime Logs if the first real sale doesn't show up. */
export async function createLoyverseSaleReceipt(params: {
  storeId: string;
  employeeId: string;
  paymentTypeId: string;
  lines: LoyverseReceiptLine[];
  note?: string;
}) {
  if (!isConfigured() || params.lines.length === 0) return;

  const totalMoney = params.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const body = {
    store_id: params.storeId,
    employee_id: params.employeeId,
    receipt_date: new Date().toISOString(),
    source: "Tienda en línea",
    note: params.note,
    line_items: params.lines.map((l) => ({
      variant_id: l.variantId,
      quantity: l.quantity,
      price: l.price,
    })),
    payments: [{ payment_type_id: params.paymentTypeId, money_amount: totalMoney }],
  };
  console.log("[loyverse] creating sale receipt:", JSON.stringify(body));
  await loyverseFetch("/receipts", { method: "POST", body: JSON.stringify(body) });
}

export function loyverseConfigured() {
  return isConfigured();
}

export function loyverseStoreId() {
  return process.env.LOYVERSE_STORE_ID ?? null;
}
