import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/money";
import { appUrl } from "@/lib/config";
import type { Prisma } from "@/generated/prisma";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { variant: { include: { product: true } } } } };
}>;

/** Same customer-facing code shown on the checkout confirmation page —
 * keep both in sync so the order a customer sees matches what they get
 * emailed. */
function orderCode(order: OrderWithItems) {
  return `#DF-${order.orderSeq.toString().padStart(5, "0")}`;
}

export async function sendOrderConfirmationEmail(order: OrderWithItems) {
  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0">${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}</td>
          <td style="padding:8px 0;text-align:right">${formatPrice(Number(item.unitPrice) * item.quantity)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>¡Gracias por tu compra!</h2>
      <p>Número de Orden: <strong>${orderCode(order)}</strong></p>
      <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
      ${Number(order.discountAmount) > 0 ? `<p>Descuento: -${formatPrice(Number(order.discountAmount))}</p>` : ""}
      <p style="font-size:18px;font-weight:bold">Total: ${formatPrice(Number(order.total))}</p>
      <p><a href="${appUrl}">Ver más productos</a></p>
    </div>
  `;

  await sendEmail({
    to: order.customerEmail,
    subject: `Confirmación de tu orden ${orderCode(order)}`,
    html,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { confirmationSentAt: new Date() },
  });
}

/** Emails the admin right away for every paid order — the point is a quick
 * phone notification so stock can be decremented by hand if the internet
 * (and therefore Loyverse sync) is down when the sale happens. */
export async function sendNewOrderAdminAlert(order: OrderWithItems) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:4px 0">${item.variant.product.name} (${item.variant.color}/${item.variant.size}) × ${item.quantity}</td>
        </tr>`,
    )
    .join("");

  await sendEmail({
    to: adminEmail,
    subject: `Nueva venta: ${orderCode(order)} — ${formatPrice(Number(order.total))}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Nueva venta en línea</h2>
        <p>Orden <strong>${orderCode(order)}</strong> — cliente: ${order.customerEmail}</p>
        <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
        <p style="font-size:18px;font-weight:bold">Total: ${formatPrice(Number(order.total))}</p>
        <p>Descuenta estas piezas del stock físico si no hay internet para el sync automático con Loyverse.</p>
      </div>
    `,
  });
}

/** Emails the admin once per dip below threshold — re-arms only after a
 * restock brings quantity back above it (see Inventory.lowStockAlertedAt). */
export async function checkLowStockAndAlert(variantId: string) {
  const inventory = await prisma.inventory.findUnique({
    where: { variantId },
    include: { variant: { include: { product: true } } },
  });
  if (!inventory) return;

  const isLow = inventory.quantity <= inventory.lowStockThreshold;

  if (!isLow && inventory.lowStockAlertedAt) {
    await prisma.inventory.update({
      where: { variantId },
      data: { lowStockAlertedAt: null },
    });
    return;
  }

  if (!isLow || inventory.lowStockAlertedAt) return;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `Stock bajo: ${inventory.variant.product.name}`,
    html: `
      <div style="font-family:sans-serif">
        <p><strong>${inventory.variant.product.name}</strong> (${inventory.variant.color}/${inventory.variant.size})
        tiene solo <strong>${inventory.quantity}</strong> unidades (alerta configurada en ${inventory.lowStockThreshold}).</p>
        <p><a href="${appUrl}/admin/inventario">Ver inventario</a></p>
      </div>
    `,
  });

  await prisma.inventory.update({
    where: { variantId },
    data: { lowStockAlertedAt: new Date() },
  });
}
