import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { checkLowStockAndAlert, sendOrderConfirmationEmail } from "./notifications";
import { computeShippingCost } from "./shipping";

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

export async function resolveCoupon(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active) throw new Error("Cupón inválido");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Cupón expirado");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Cupón agotado");
  }
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
    throw new Error(`El cupón requiere un mínimo de compra de ${coupon.minOrderAmount}`);
  }

  const discount =
    coupon.type === "PERCENTAGE"
      ? subtotal * (Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), subtotal);

  return { coupon, discount };
}

/** Creates a PENDING order without touching inventory yet — stock is only
 * decremented once payment is confirmed (see confirmOrderPaid). */
export async function createPendingOrder(
  items: CheckoutItemInput[],
  customer: CheckoutCustomer,
  couponCode?: string,
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
    let unitPrice = variant.price ? Number(variant.price) : Number(variant.product.basePrice);
    if (
      variant.product.wholesaleEnabled &&
      variant.product.wholesaleMinQty &&
      variant.product.wholesaleDiscountPercent &&
      item.quantity >= variant.product.wholesaleMinQty
    ) {
      unitPrice *= 1 - Number(variant.product.wholesaleDiscountPercent) / 100;
    }
    subtotal += unitPrice * item.quantity;
    orderItemsData.push({
      variantId: variant.id,
      quantity: item.quantity,
      unitPrice,
    });
  }

  let discountAmount = 0;
  let couponId: string | undefined;
  if (couponCode) {
    const { coupon, discount } = await resolveCoupon(couponCode, subtotal);
    discountAmount = discount;
    couponId = coupon.id;
  }

  const shippingCost = await computeShippingCost(subtotal);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      status: "PENDING",
      customerEmail: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone,
      shippingAddress: customer.address,
      subtotal,
      discountAmount,
      shippingCost,
      total: Math.max(0, subtotal - discountAmount) + shippingCost,
      couponId,
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
  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!order || order.status !== "PENDING") return null;

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

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    return order;
  });

  if (!order) return;

  await sendOrderConfirmationEmail(order).catch((err) =>
    console.error("[orders] failed to send confirmation email:", err),
  );

  for (const item of order.items) {
    await checkLowStockAndAlert(item.variantId).catch((err) =>
      console.error("[orders] failed to check low stock:", err),
    );
  }
}

/** Per-line amounts (in cents) that sum exactly to order.total, scaling
 * each item proportionally by the coupon discount so payment providers —
 * which bill per line item, not a single total — charge the right amount
 * without needing a negative "discount" line. */
export function computeDiscountedLineAmountsCents(order: {
  subtotal: Prisma.Decimal | number;
  discountAmount: Prisma.Decimal | number;
  items: { quantity: number; unitPrice: Prisma.Decimal | number }[];
}) {
  const subtotal = Number(order.subtotal);
  const total = Math.max(0, subtotal - Number(order.discountAmount));
  const ratio = subtotal > 0 ? total / subtotal : 1;

  const amounts = order.items.map((item) =>
    Math.round(Number(item.unitPrice) * item.quantity * ratio * 100),
  );

  const targetCents = Math.round(total * 100);
  const diff = targetCents - amounts.reduce((sum, a) => sum + a, 0);
  if (amounts.length > 0) amounts[amounts.length - 1] += diff;

  return amounts;
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
}
