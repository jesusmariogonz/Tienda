import { NextRequest, NextResponse } from "next/server";
import { applyLoyverseInventoryLevel } from "@/server/services/loyverse";

type RawLevel = Record<string, unknown>;

function firstDefined(obj: RawLevel, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

// Loyverse's own "test notification" button appears to probe the URL with
// a GET/HEAD before accepting it — this route used to only export POST,
// so that probe got Next's default 405 and Loyverse reported "URL
// incorrecta" even though the URL was right. GET/HEAD just need to answer
// 200; the real event delivery is the POST handler below.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// Loyverse doesn't sign webhook payloads the way Stripe does, so there's no
// signature to verify — same trust level as the Mercado Pago webhook in
// this app, which also takes the payload at face value.
//
// The exact shape/field names below are a best guess (never verified
// against a real delivery before this store connected Loyverse) — every
// payload is logged so a real failure can be diagnosed from Vercel's
// Runtime Logs (Project → Logs) by searching "[webhooks/loyverse] raw".
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    console.log("[webhooks/loyverse] raw payload:", JSON.stringify(body));

    // Loyverse's own inventory events nest the array under a few possible
    // keys depending on version/event type — accept whichever is present.
    const container = (body?.inventory_levels ?? body?.data?.inventory_levels ?? body?.data ?? body) as
      | RawLevel
      | RawLevel[]
      | undefined;

    let levels: RawLevel[];
    if (Array.isArray(container)) {
      levels = container;
    } else if (container && typeof container === "object") {
      levels = [container as RawLevel];
    } else {
      levels = [];
    }

    let applied = 0;
    for (const level of levels) {
      if (typeof level !== "object" || level === null) continue;
      const variantId = firstDefined(level, ["variant_id", "variantId"]);
      const quantityRaw = firstDefined(level, [
        "stock_count",
        "in_stock",
        "available_stock",
        "quantity",
        "count",
      ]);
      const quantity = Number(quantityRaw);
      if (typeof variantId !== "string" || !variantId || !Number.isFinite(quantity)) continue;

      await applyLoyverseInventoryLevel(variantId, quantity).catch((err) =>
        console.error("[webhooks/loyverse] failed to apply inventory level:", err),
      );
      applied++;
    }

    console.log(`[webhooks/loyverse] applied ${applied} of ${levels.length} level(s)`);
    return NextResponse.json({ received: true, applied });
  } catch (err) {
    // Never let an unexpected payload shape bounce Loyverse's test/retry
    // with a 500 — log it and still answer 200.
    console.error("[webhooks/loyverse] unexpected error:", err);
    return NextResponse.json({ received: true, applied: 0 });
  }
}
