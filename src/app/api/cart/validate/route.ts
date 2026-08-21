import { NextRequest, NextResponse } from "next/server";
import { getVariantStockMap } from "@/server/services/inventory";

// Re-checks live stock for the variants currently in a client's cart. The
// cart is persisted to localStorage per device, so two devices (or two
// tabs) can each think a since-sold-out item is still available — this
// lets the UI catch that before checkout instead of only failing at
// payment time.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const variantIds: string[] = Array.isArray(body?.variantIds) ? body.variantIds : [];
  const stock = await getVariantStockMap(variantIds);
  return NextResponse.json({ stock });
}
