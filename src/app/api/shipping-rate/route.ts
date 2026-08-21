import { NextRequest, NextResponse } from "next/server";
import { computeShippingCost, getShippingSettings } from "@/server/services/shipping";

export async function GET(req: NextRequest) {
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal") ?? 0);
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const [cost, { freeOverAmount }] = await Promise.all([
    computeShippingCost(safeSubtotal),
    getShippingSettings(),
  ]);
  return NextResponse.json({ cost, freeOverAmount });
}
