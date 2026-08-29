import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { confirmOrderPaid } from "@/server/services/orders";

// Mercado Pago can notify either as a JSON body (newer "webhooks", e.g.
// {"type":"payment","data":{"id":"123"}}) or as query params on the URL
// itself (classic IPN, e.g. ?topic=payment&id=123 or
// ?type=payment&data.id=123) — read both so neither format is silently
// dropped. Every call is logged (payload + outcome) so a delivery that
// doesn't result in a confirmed order still leaves a trace in Vercel's
// Runtime Logs, instead of vanishing the way it did before this was added.
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = req.nextUrl.searchParams;

  const paymentId =
    body?.data?.id ?? query.get("data.id") ?? query.get("id") ?? undefined;

  console.log(
    "[webhooks/mercadopago] received:",
    JSON.stringify({ body, query: Object.fromEntries(query), paymentId }),
  );

  if (!paymentId) {
    console.log("[webhooks/mercadopago] no payment id found, ignoring");
    return NextResponse.json({ received: true });
  }

  try {
    const payment = await getMercadoPagoPayment().get({ id: paymentId });
    const orderId = payment.external_reference;
    console.log(
      `[webhooks/mercadopago] payment ${paymentId} status=${payment.status} orderId=${orderId}`,
    );
    if (orderId && payment.status === "approved") {
      await confirmOrderPaid(orderId);
      console.log(`[webhooks/mercadopago] confirmed order ${orderId}`);
    }
  } catch (err) {
    // Mercado Pago retries failed notifications; swallow and let it retry,
    // but log so a persistent failure is still visible.
    console.error("[webhooks/mercadopago] failed to process:", err);
  }

  return NextResponse.json({ received: true });
}
