import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { confirmOrderPaid } from "@/server/services/orders";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId = body?.data?.id;
  if (!paymentId) return NextResponse.json({ received: true });

  try {
    const payment = await getMercadoPagoPayment().get({ id: paymentId });
    const orderId = payment.external_reference;
    if (orderId && payment.status === "approved") {
      await confirmOrderPaid(orderId);
    }
  } catch {
    // Mercado Pago retries failed notifications; swallow and let it retry.
  }

  return NextResponse.json({ received: true });
}
