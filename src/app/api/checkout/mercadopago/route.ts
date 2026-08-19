import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMercadoPagoPreference } from "@/lib/mercadopago";
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

  const preference = getMercadoPagoPreference();
  const result = await preference.create({
    body: {
      items: order.items.map((item, i) => ({
        id: item.variantId,
        title: `${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}`,
        quantity: 1,
        unit_price: lineAmounts[i] / 100,
        currency_id: currency,
      })),
      payer: { email: customer.email, name: customer.name },
      external_reference: order.id,
      back_urls: {
        success: `${appUrl}/checkout/exito?order=${order.id}`,
        failure: `${appUrl}/checkout/error?order=${order.id}`,
        pending: `${appUrl}/checkout/error?order=${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    },
  });

  await attachPaymentIntent(order.id, "MERCADO_PAGO", result.id ?? "");

  return NextResponse.json({ url: result.init_point });
}
