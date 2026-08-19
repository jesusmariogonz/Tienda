import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export type CheckoutItemInput = {
  variantId: string;
  quantity: number;
};

export type CheckoutCustomer = {
  email: string;
  name?: string;
  phone?: string;
  address?: Prisma.InputJsonValue;
};

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${stamp}-${rand}`;
}

/** Creates a PENDING order without touching inventory yet — stock is only
 * decremented once payment is confirmed (see confirmOrderPaid). */
export async function createPendingOrder(
  items: CheckoutItemInput[],
  customer: CheckoutCustomer,
) {
  if (items.length === 0) throw new Error("El carrito está vacío");

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    include: { inventory: true, product: true },
  });

  let subtotal = 0;
  const orderItemsData: {
    variantId: string;
    quantity: number;
    unitPrice: Prisma.Decimal | number;
  }[] = [];

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.active) {
      throw new Error("Variante no disponible");
    }
    const available = variant.inventory?.quantity ?? 0;
    if (item.quantity < 1 || item.quantity > available) {
      throw new Error(`Stock insuficiente para ${variant.product.name}`);
    }
    const unitPrice = variant.price
      ? Number(variant.price)
      : Number(variant.product.basePrice);
    subtotal += unitPrice * item.quantity;
    orderItemsData.push({
      variantId: variant.id,
      quantity: item.quantity,
      unitPrice,
    });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      status: "PENDING",
      customerEmail: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone,
      shippingAddress: customer.address,
      subtotal,
      shippingCost: 0,
      total: subtotal,
      items: { create: orderItemsData },
    },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  return order;
}

export async function attachPaymentIntent(
  orderId: string,
  provider: "STRIPE" | "MERCADO_PAGO",
  paymentRef: string,
) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentProvider: provider, paymentRef },
  });
}

/** Marks an order as paid and decrements inventory atomically, recording an
 * InventoryMovement per line so the audit trail matches POS sales. Safe to
 * call more than once (webhooks can redeliver) — no-ops if already paid. */
export async function confirmOrderPaid(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== "PENDING") return;

    for (const item of order.items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: "ONLINE_SALE",
          quantity: -item.quantity,
          orderId: order.id,
          note: `Orden ${order.orderNumber}`,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
}
