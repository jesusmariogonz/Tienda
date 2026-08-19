import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { appUrl, currency } from "@/lib/config";
import {
  attachPaymentIntent,
  computeDiscountedLineAmountsCents,
  createPendingOrder,
} from "@/server/services/orders";

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
  }),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { items, customer, couponCode } = parsed.data;

  let order;
  try {
    order = await createPendingOrder(items, customer, couponCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear la orden";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const lineAmounts = computeDiscountedLineAmountsCents(order);

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customer.email,
    line_items: order.items.map((item, i) => ({
      quantity: 1,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: lineAmounts[i],
        product_data: {
          name: `${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}`,
        },
      },
    })),
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
    success_url: `${appUrl}/checkout/exito?order=${order.id}`,
    cancel_url: `${appUrl}/checkout/error?order=${order.id}`,
  });

  await attachPaymentIntent(order.id, "STRIPE", session.id);

  return NextResponse.json({ url: session.url });
}
