"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  clearSkydropxQuote,
  getOrderWithShipment,
  saveSkydropxQuote,
  upsertShipment,
} from "@/server/services/shipments";
import { getOriginAddress, saveShippingSettings } from "@/server/services/shipping";
import { bookSkydropxShipment, getSkydropxBalance, quoteSkydropxShipment } from "@/lib/skydropx";

function truncate(message: string) {
  // A raw provider error body can be huge and blow past the URL length
  // limit when passed through the redirect query string.
  return message.length > 300
    ? `${message.slice(0, 300)}… (ver logs de Vercel para el detalle completo)`
    : message;
}

function errorRedirect(orderId: string, message: string): never {
  redirect(`/admin/envios/${orderId}?skydropx_error=${encodeURIComponent(truncate(message))}`);
}

export async function saveShipmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const orderId = formData.get("orderId") as string;
  if (!orderId) return;

  const costRaw = formData.get("cost") as string;

  await upsertShipment(orderId, {
    carrier: (formData.get("carrier") as string) || undefined,
    trackingNumber: (formData.get("trackingNumber") as string) || undefined,
    trackingUrl: (formData.get("trackingUrl") as string) || undefined,
    labelUrl: (formData.get("labelUrl") as string) || undefined,
    cost: costRaw ? Number(costRaw) : undefined,
    notes: (formData.get("notes") as string) || undefined,
    status:
      (formData.get("status") as
        | "PENDING"
        | "LABEL_CREATED"
        | "IN_TRANSIT"
        | "DELIVERED"
        | "RETURNED"
        | "CANCELLED") || "PENDING",
  });

  revalidatePath("/admin/envios");
  revalidatePath(`/admin/envios/${orderId}`);
  redirect(`/admin/envios/${orderId}`);
}

export async function quoteSkydropxAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const orderId = formData.get("orderId") as string;
  if (!orderId) return;

  const order = await getOrderWithShipment(orderId);
  if (!order) return;

  const address = (order.shippingAddress ?? null) as
    | { street?: string; city?: string; state?: string; zip?: string; references?: string }
    | null;
  if (!address?.street) errorRedirect(orderId, "Sin dirección en la orden");

  const origin = await getOriginAddress();
  if (!origin) {
    errorRedirect(orderId, "Falta configurar la dirección de origen en /admin/envios/tarifas");
  }

  try {
    const quote = await quoteSkydropxShipment({ origin, toAddress: address });
    if (!quote) errorRedirect(orderId, "Skydropx no está configurado (faltan las credenciales)");
    if (quote.rates.length === 0) {
      errorRedirect(
        orderId,
        `Sin tarifas disponibles para esta dirección (cotización ${quote.quotationId})`,
      );
    }
    await saveSkydropxQuote(orderId, quote.quotationId, quote.rates);
  } catch (err) {
    console.error("[envios] Skydropx quote failed:", err);
    errorRedirect(orderId, err instanceof Error ? err.message : "Error desconocido");
  }

  revalidatePath(`/admin/envios/${orderId}`);
  redirect(`/admin/envios/${orderId}`);
}

export async function bookSkydropxAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const orderId = formData.get("orderId") as string;
  const rateId = formData.get("rateId") as string;
  const requestPickup = formData.get("requestPickup") === "on";
  if (!orderId || !rateId) return;

  const order = await getOrderWithShipment(orderId);
  if (!order?.shipment?.skydropxQuotationId) return;

  const address = (order.shippingAddress ?? null) as
    | { street?: string; city?: string; state?: string; zip?: string; references?: string }
    | null;
  if (!address?.street) errorRedirect(orderId, "Sin dirección en la orden");

  const origin = await getOriginAddress();
  if (!origin) {
    errorRedirect(orderId, "Falta configurar la dirección de origen en /admin/envios/tarifas");
  }

  try {
    const result = await bookSkydropxShipment({
      quotationId: order.shipment.skydropxQuotationId,
      rateId,
      origin,
      toAddress: address,
      customerName: order.customerName ?? order.customerEmail,
      customerPhone: order.customerPhone ?? undefined,
      customerEmail: order.customerEmail,
      requestPickup,
    });

    await upsertShipment(orderId, {
      carrier: result.carrier,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl ?? undefined,
      labelUrl: result.labelUrl ?? undefined,
      cost: result.cost,
      status: "LABEL_CREATED",
    });
    await clearSkydropxQuote(orderId);
  } catch (err) {
    console.error("[envios] Skydropx booking failed:", err);
    errorRedirect(orderId, err instanceof Error ? err.message : "Error desconocido");
  }

  revalidatePath("/admin/envios");
  revalidatePath(`/admin/envios/${orderId}`);
  redirect(`/admin/envios/${orderId}`);
}

export async function cancelSkydropxQuoteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const orderId = formData.get("orderId") as string;
  if (!orderId) return;

  await clearSkydropxQuote(orderId);
  revalidatePath(`/admin/envios/${orderId}`);
  redirect(`/admin/envios/${orderId}`);
}

export async function checkSkydropxBalanceAction() {
  const session = await auth();
  if (!session?.user) return;

  let message: string;
  try {
    const balance = await getSkydropxBalance();
    message = balance
      ? `Saldo disponible: ${new Intl.NumberFormat("es-MX", { style: "currency", currency: balance.currency }).format(balance.amount)}`
      : "Skydropx no está configurado (faltan las credenciales)";
  } catch (err) {
    console.error("[envios] Skydropx balance check failed:", err);
    message = `No se pudo consultar el saldo: ${err instanceof Error ? err.message : "error desconocido"}`;
  }

  redirect(`/admin/envios?skydropx_balance=${encodeURIComponent(truncate(message))}`);
}

export async function saveShippingSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const flatRate = Number(formData.get("flatRate"));
  const freeOverRaw = formData.get("freeOverAmount") as string;
  const freeOverAmount = freeOverRaw ? Number(freeOverRaw) : null;

  if (!Number.isFinite(flatRate) || flatRate < 0) return;

  await saveShippingSettings(flatRate, freeOverAmount, {
    company: (formData.get("originCompany") as string) || "",
    name: (formData.get("originName") as string) || "",
    street: (formData.get("originStreet") as string) || "",
    city: (formData.get("originCity") as string) || "",
    state: (formData.get("originState") as string) || "",
    zip: (formData.get("originZip") as string) || "",
    phone: (formData.get("originPhone") as string) || "",
    email: (formData.get("originEmail") as string) || "",
  });
  revalidatePath("/admin/envios/tarifas");
  redirect("/admin/envios/tarifas");
}
