import { NextRequest, NextResponse } from "next/server";
import { applyLoyverseInventoryLevel } from "@/server/services/loyverse";

// Loyverse webhook payload (configured in Back Office → Settings →
// Integrations → Webhooks, event type "inventory_levels.update", pointed
// at this URL): { inventory_levels: [{ variant_id, store_id, stock_count }] }.
// Loyverse doesn't sign webhook payloads the way Stripe does, so there's
// no signature to verify here — same trust level as the Mercado Pago
// webhook in this app, which also takes the payload at face value.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const levels: unknown[] = Array.isArray(body?.inventory_levels)
    ? body.inventory_levels
    : body?.inventory_level
      ? [body.inventory_level]
      : [];

  for (const level of levels as { variant_id?: string; stock_count?: number }[]) {
    const variantId = level?.variant_id;
    const quantity = Number(level?.stock_count);
    if (!variantId || !Number.isFinite(quantity)) continue;
    await applyLoyverseInventoryLevel(variantId, quantity).catch((err) =>
      console.error("[webhooks/loyverse] failed to apply inventory level:", err),
    );
  }

  return NextResponse.json({ received: true });
}
