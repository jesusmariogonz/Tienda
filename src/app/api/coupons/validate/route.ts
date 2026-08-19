import { NextRequest, NextResponse } from "next/server";
import { resolveCoupon } from "@/server/services/orders";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal"));
  if (!code || !Number.isFinite(subtotal)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    const { discount } = await resolveCoupon(code, subtotal);
    return NextResponse.json({ discount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cupón inválido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
