import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteShippingOptions, getShippingSettings } from "@/server/services/shipping";

const bodySchema = z.object({
  subtotal: z.number().nonnegative(),
  weightKg: z.number().positive().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    references: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const options = await quoteShippingOptions(
    parsed.data.address,
    parsed.data.subtotal,
    parsed.data.weightKg,
  );
  return NextResponse.json(options);
}

// Kept for the initial page-load estimate (before an address is known),
// which only depends on the subtotal.
export async function GET(req: NextRequest) {
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal") ?? 0);
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const [options, { freeOverAmount }] = await Promise.all([
    quoteShippingOptions({}, safeSubtotal),
    getShippingSettings(),
  ]);
  const cost = options.source === "flat" ? options.cost : (options.rates[0]?.total ?? 0);
  return NextResponse.json({ cost, freeOverAmount });
}
