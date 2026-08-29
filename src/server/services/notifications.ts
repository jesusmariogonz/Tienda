import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/money";
import { appUrl, STORE_PICKUP_ADDRESS } from "@/lib/config";
import type { Prisma } from "@/generated/prisma";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        variant: { include: { product: { include: { images: true } } } };
      };
    };
  };
}>;

type ShippingAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  colonia?: string;
  references?: string;
};

/** Same customer-facing code shown on the checkout confirmation page —
 * keep both in sync so the order a customer sees matches what they get
 * emailed. */
function orderCode(order: OrderWithItems) {
  return `#DF-${order.orderSeq.toString().padStart(5, "0")}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Branded confirmation email — design provided by the store owner
 * (dupefitorderconfirmation.html), adapted here to fill in real order
 * data instead of the {{placeholder}} tokens in the source template. */
export async function sendOrderConfirmationEmail(order: OrderWithItems) {
  const address = (order.shippingAddress ?? {}) as ShippingAddress;

  const productRows = order.items
    .map((item) => {
      const image = item.variant.product.images[0]?.url;
      const imgCell = image
        ? `<img class="product-img" src="${escapeHtml(image)}" alt="${escapeHtml(item.variant.product.name)}" />`
        : `<div class="product-img-placeholder"><span>DF</span></div>`;
      return `
        <div class="product-row">
          ${imgCell}
          <div class="product-info">
            <div class="product-name">${escapeHtml(item.variant.product.name)}</div>
            <div class="product-variant">${escapeHtml(item.variant.color)} · Talla ${escapeHtml(item.variant.size)} · x${item.quantity}</div>
          </div>
          <div class="product-price">${formatPrice(Number(item.unitPrice) * item.quantity)}</div>
        </div>`;
    })
    .join("");

  const addressLines = order.pickupInStore
    ? []
    : [
        order.customerName ?? "",
        address.street ?? "",
        [address.colonia, address.city, address.state, address.zip].filter(Boolean).join(", "),
        address.references ?? "",
      ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirmación de pedido — Dupe Fit</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background-color: #F2F2F0; font-family: 'Inter', Arial, sans-serif; color: #1A1A1A; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px 60px; }
  .header { background-color: #0D0D0D; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center; }
  .logo { font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.12em; text-transform: uppercase; }
  .hero-strip { background-color: #1A1A1A; padding: 20px 40px; text-align: center; }
  .hero-strip h1 { font-size: 15px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.08em; text-transform: uppercase; }
  .hero-strip p { font-size: 13px; color: #AAAAAA; margin-top: 4px; }
  .card { background-color: #FFFFFF; padding: 36px 40px; }
  .greeting { font-size: 15px; color: #1A1A1A; line-height: 1.6; margin-bottom: 28px; border-bottom: 1px solid #EFEFEF; padding-bottom: 28px; }
  .greeting strong { display: block; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .order-meta { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 12px; }
  .meta-block { flex: 1; }
  .meta-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #999999; margin-bottom: 4px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1A1A1A; }
  .status-badge { display: inline-block; background-color: #E8E8E8; color: #1A1A1A; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px; letter-spacing: 0.05em; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #999999; margin-bottom: 14px; margin-top: 28px; }
  .product-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-top: 1px solid #F0F0F0; }
  .product-row:last-child { border-bottom: 1px solid #F0F0F0; }
  .product-img { width: 64px; height: 64px; border-radius: 8px; background-color: #F0F0F0; object-fit: cover; flex-shrink: 0; }
  .product-img-placeholder { width: 64px; height: 64px; border-radius: 8px; background-color: #0D0D0D; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .product-img-placeholder span { font-size: 10px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.08em; }
  .product-info { flex: 1; }
  .product-name { font-size: 14px; font-weight: 600; color: #1A1A1A; margin-bottom: 3px; }
  .product-variant { font-size: 12px; color: #888888; }
  .product-price { font-size: 15px; font-weight: 700; color: #1A1A1A; white-space: nowrap; }
  .totals { margin-top: 20px; border-top: 1px solid #F0F0F0; padding-top: 16px; }
  .total-row { display: flex; justify-content: space-between; font-size: 13px; color: #666666; margin-bottom: 8px; }
  .total-row.grand { font-size: 16px; font-weight: 700; color: #1A1A1A; margin-top: 12px; padding-top: 12px; border-top: 2px solid #0D0D0D; }
  .address-block { background-color: #F8F8F7; border-radius: 8px; padding: 16px 20px; margin-top: 8px; }
  .address-block p { font-size: 13px; color: #444444; line-height: 1.7; }
  .btn-wrap { text-align: center; margin: 32px 0 24px; }
  .btn { display: inline-block; background-color: #0D0D0D; color: #FFFFFF; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none; padding: 14px 36px; border-radius: 6px; }
  .trust-strip { display: flex; justify-content: center; gap: 32px; margin-top: 28px; padding-top: 24px; border-top: 1px solid #F0F0F0; }
  .trust-item { text-align: center; }
  .trust-icon { font-size: 20px; margin-bottom: 4px; }
  .trust-label { font-size: 11px; color: #888888; font-weight: 500; }
  .footer { background-color: #0D0D0D; border-radius: 0 0 12px 12px; padding: 28px 40px; text-align: center; }
  .social-row { display: flex; justify-content: center; gap: 20px; margin-bottom: 16px; }
  .social-link { font-size: 12px; font-weight: 600; color: #FFFFFF; text-decoration: none; letter-spacing: 0.05em; text-transform: uppercase; }
  .footer-whatsapp { font-size: 12px; color: #666666; margin-bottom: 16px; }
  .footer-whatsapp a { color: #FFFFFF; text-decoration: none; font-weight: 600; }
  .footer-copy { font-size: 11px; color: #444444; line-height: 1.6; }
  @media (max-width: 480px) {
    .card { padding: 28px 24px; }
    .header { padding: 24px; }
    .hero-strip { padding: 16px 24px; }
    .footer { padding: 24px; }
    .order-meta { flex-direction: column; gap: 16px; }
    .trust-strip { gap: 16px; }
    .trust-label { font-size: 10px; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">DUPE<span>FIT</span></div>
    </div>

    <div class="hero-strip">
      <h1>Pedido confirmado</h1>
      <p>Gracias por tu compra — ya estamos en ello.</p>
    </div>

    <div class="card">
      <div class="greeting">
        <strong>¡Hola, ${escapeHtml(order.customerName ?? "")}! 👋</strong>
        Recibimos tu pedido y ya está siendo procesado. Te avisaremos en cuanto salga con tu número de rastreo.
      </div>

      <div class="order-meta">
        <div class="meta-block">
          <div class="meta-label">Número de orden</div>
          <div class="meta-value">${orderCode(order)}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Fecha</div>
          <div class="meta-value">${order.createdAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Estado</div>
          <div class="meta-value"><span class="status-badge">Pagado ✓</span></div>
        </div>
      </div>

      <div class="section-title">Tu pedido</div>
      ${productRows}

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatPrice(Number(order.subtotal))}</span>
        </div>
        ${
          Number(order.discountAmount) > 0
            ? `<div class="total-row"><span>Descuento</span><span>-${formatPrice(Number(order.discountAmount))}</span></div>`
            : ""
        }
        <div class="total-row">
          <span>Envío</span>
          <span>${Number(order.shippingCost) > 0 ? formatPrice(Number(order.shippingCost)) : "Gratis"}</span>
        </div>
        <div class="total-row grand">
          <span>Total</span>
          <span>${formatPrice(Number(order.total))}</span>
        </div>
      </div>

      ${
        order.pickupInStore
          ? `<div class="section-title">Recoger en tienda</div>
      <div class="address-block">
        <p>${escapeHtml(STORE_PICKUP_ADDRESS)}</p>
      </div>`
          : addressLines.length > 0
            ? `<div class="section-title">Dirección de entrega</div>
      <div class="address-block">
        <p>${addressLines.map(escapeHtml).join("<br />")}</p>
      </div>`
            : ""
      }

      <div class="btn-wrap">
        <a href="${appUrl}/checkout/exito?order=${order.id}" class="btn">Ver mi pedido</a>
      </div>

      <div class="trust-strip">
        <div class="trust-item">
          <div class="trust-icon">🔒</div>
          <div class="trust-label">Pago seguro</div>
        </div>
        <div class="trust-item">
          <div class="trust-icon">📦</div>
          <div class="trust-label">Envío rastreado</div>
        </div>
        <div class="trust-item">
          <div class="trust-icon">↩️</div>
          <div class="trust-label">Cambios disponibles</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="social-row">
        <a href="https://instagram.com/dupe_fit.mx" class="social-link">Instagram</a>
        <a href="https://tiktok.com/@dupefitmx" class="social-link">TikTok</a>
      </div>
      <p class="footer-whatsapp">
        ¿Tienes dudas? Escríbenos directo:<br />
        <a href="https://wa.me/526631992165">WhatsApp Dupe Fit</a>
      </p>
      <p class="footer-copy">
        © ${new Date().getFullYear()} Dupe Fit · Saltillo, Coahuila, México<br />
        Ropa deportiva y streetwear hecha para moverse contigo.
      </p>
    </div>
  </div>
</body>
</html>`;

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
