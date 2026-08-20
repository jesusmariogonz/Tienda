import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/config";
import { confirmOrderPaid, createPendingOrder } from "@/server/services/orders";

// Demo-only checkout: creates the order and marks it paid immediately,
// without touching Stripe/Mercado Pago — inventory still decrements and the
// confirmation email still sends, so a client can see the full flow before
// real payment provider keys are configured. Gated by
// NEXT_PUBLIC_DEMO_CHECKOUT so it can be turned off once selling for real.
const bodySchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  customer: z.object({
    email: z.string().email(),
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z
      .object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        references: z.string().optional(),
      })
      .optional(),
  }),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_CHECKOUT !== "true") {
    return NextResponse.json({ error: "Compra de prueba deshabilitada" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { items, customer, couponCode } = parsed.data;

  try {
    const order = await createPendingOrder(items, customer, couponCode);
    await confirmOrderPaid(order.id);

    return NextResponse.json({ url: `${appUrl}/checkout/exito?order=${order.id}` });
  } catch (err) {
    console.error("[checkout/demo] failed:", err);
    const message = err instanceof Error ? err.message : "No se pudo crear la orden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
