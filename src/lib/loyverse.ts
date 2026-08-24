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
  itemName: string;
  sku: string;
};

/** Paginates through every item in the Loyverse catalog, flattened to one
 * entry per variant (Loyverse nests variants under items) — used to match
 * our ProductVariant.sku against Loyverse's variant_id once, so later
 * syncs don't need to re-resolve the mapping. */
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
        if (v.sku) variants.push({ variantId: v.variant_id, itemName: item.item_name, sku: v.sku });
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
        stock_count: u.quantity,
      })),
    }),
  });
}

export function loyverseConfigured() {
  return isConfigured();
}

export function loyverseStoreId() {
  return process.env.LOYVERSE_STORE_ID ?? null;
}
