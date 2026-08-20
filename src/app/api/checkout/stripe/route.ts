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

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer.email,
      line_items: [
        ...order.items.map((item, i) => ({
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: lineAmounts[i],
            product_data: {
              name: `${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}`,
            },
          },
        })),
        ...(Number(order.shippingCost) > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: currency.toLowerCase(),
                  unit_amount: Math.round(Number(order.shippingCost) * 100),
                  product_data: { name: "Envío" },
                },
              },
            ]
          : []),
      ],
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      success_url: `${appUrl}/checkout/exito?order=${order.id}`,
      cancel_url: `${appUrl}/checkout/error?order=${order.id}`,
    });

    await attachPaymentIntent(order.id, "STRIPE", session.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout/stripe] failed:", err);
    const message = err instanceof Error ? err.message : "No se pudo iniciar el pago con Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
