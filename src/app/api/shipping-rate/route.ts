import { NextRequest, NextResponse } from "next/server";
import { computeShippingCost } from "@/server/services/shipping";

export async function GET(req: NextRequest) {
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal") ?? 0);
  const cost = await computeShippingCost(Number.isFinite(subtotal) ? subtotal : 0);
  return NextResponse.json({ cost });
}
