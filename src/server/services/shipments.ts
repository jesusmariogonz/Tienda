import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export function listShipments() {
  return prisma.order.findMany({
    where: { status: { in: ["PAID", "FULFILLED"] } },
    include: { shipment: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getOrderWithShipment(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shipment: true,
      items: { include: { variant: { include: { product: true } } } },
    },
  });
}

export type ShipmentInput = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  cost?: number;
  notes?: string;
  status?: "PENDING" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "CANCELLED";
};

export async function upsertShipment(orderId: string, input: ShipmentInput) {
  const data: Prisma.ShipmentUpdateInput = {
    carrier: input.carrier || null,
    trackingNumber: input.trackingNumber || null,
    trackingUrl: input.trackingUrl || null,
    labelUrl: input.labelUrl || null,
    cost: input.cost !== undefined ? input.cost : null,
    notes: input.notes || null,
    status: input.status ?? "PENDING",
    shippedAt: input.status === "IN_TRANSIT" || input.status === "DELIVERED" ? new Date() : undefined,
    deliveredAt: input.status === "DELIVERED" ? new Date() : undefined,
  };

  return prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      carrier: input.carrier || null,
      trackingNumber: input.trackingNumber || null,
      trackingUrl: input.trackingUrl || null,
      labelUrl: input.labelUrl || null,
      cost: input.cost !== undefined ? input.cost : null,
      notes: input.notes || null,
      status: input.status ?? "PENDING",
      shippedAt: data.shippedAt as Date | undefined,
      deliveredAt: data.deliveredAt as Date | undefined,
    },
    update: data,
  });
}

export async function saveSkydropxQuote(
  orderId: string,
  quotationId: string,
  rates: unknown,
  selectedRateId?: string,
) {
  return prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      skydropxQuotationId: quotationId,
      skydropxQuoteJson: rates as Prisma.InputJsonValue,
      skydropxSelectedRateId: selectedRateId ?? null,
    },
    update: {
      skydropxQuotationId: quotationId,
      skydropxQuoteJson: rates as Prisma.InputJsonValue,
      skydropxSelectedRateId: selectedRateId ?? null,
    },
  });
}

export async function clearSkydropxQuote(orderId: string) {
  await prisma.shipment.updateMany({
    where: { orderId },
    data: {
      skydropxQuotationId: null,
      skydropxQuoteJson: Prisma.JsonNull,
      skydropxSelectedRateId: null,
    },
  });
}
