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
    address: z
      .object({
        street: z.string().min(1, "Falta la calle"),
        city: z.string().min(1, "Falta la ciudad"),
        state: z.string().min(1, "Falta el estado"),
        zip: z.string().min(1, "Falta el código postal"),
        colonia: z.string().optional(),
        references: z.string().optional(),
      })
      .optional(),
  }),
  couponCode: z.string().optional(),
  shipping: z
    .object({
      quotationId: z.string(),
      rateId: z.string(),
    })
    .optional(),
  pickup: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { items, customer, couponCode, shipping, pickup } = parsed.data;
  if (!pickup && !customer.address) {
    return NextResponse.json({ error: "Falta la dirección de envío" }, { status: 400 });
  }

  let order;
  try {
    order = await createPendingOrder(items, customer, couponCode, shipping, pickup);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear la orden";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const lineAmounts = computeDiscountedLineAmountsCents(order);

  try {
    const preference = getMercadoPagoPreference();
    const result = await preference.create({
      body: {
        items: [
          ...order.items.map((item, i) => ({
            id: item.variantId,
            title: `${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}`,
            quantity: 1,
            unit_price: lineAmounts[i] / 100,
            currency_id: currency,
          })),
          ...(Number(order.shippingCost) > 0
            ? [
                {
                  id: "shipping",
                  title: "Envío",
                  quantity: 1,
                  unit_price: Number(order.shippingCost),
                  currency_id: currency,
                },
              ]
            : []),
        ],
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
  } catch (err) {
    console.error("[checkout/mercadopago] failed:", err);
    const message =
      err instanceof Error ? err.message : "No se pudo iniciar el pago con Mercado Pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
