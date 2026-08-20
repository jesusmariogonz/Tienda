import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Receives shipment status updates from Skydropx and reflects them on the
// matching Shipment (looked up by tracking number). Exact payload shape
// should be confirmed against the account's webhook docs once configured
// in the Skydropx dashboard — this covers the common case (tracking number
// + a status string) and no-ops on anything it doesn't recognize instead
// of failing the webhook.
const STATUS_MAP: Record<string, string> = {
  in_transit: "IN_TRANSIT",
  delivered: "DELIVERED",
  returned: "RETURNED",
  cancelled: "CANCELLED",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const trackingNumber = body?.tracking_number ?? body?.trackingNumber;
  const rawStatus = body?.status ?? body?.event;
  const status = rawStatus ? STATUS_MAP[String(rawStatus).toLowerCase()] : undefined;

  if (!trackingNumber || !status) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const shipment = await prisma.shipment.findFirst({ where: { trackingNumber } });
  if (!shipment) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: status as "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "CANCELLED",
      shippedAt: status === "IN_TRANSIT" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
