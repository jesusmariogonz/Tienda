"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { upsertShipment } from "@/server/services/shipments";
import { getOriginAddress, saveShippingSettings } from "@/server/services/shipping";
import { getOrderWithShipment } from "@/server/services/shipments";
import { createSkydropxLabel } from "@/lib/skydropx";

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

export async function generateSkydropxLabelAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const orderId = formData.get("orderId") as string;
  if (!orderId) return;

  const order = await getOrderWithShipment(orderId);
  if (!order) return;

  const address = (order.shippingAddress ?? null) as
    | { street?: string; city?: string; state?: string; zip?: string; references?: string }
    | null;
  if (!address?.street) {
    redirect(`/admin/envios/${orderId}?skydropx_error=Sin+dirección+en+la+orden`);
  }

  let errorMessage: string | null = null;
  try {
    const origin = await getOriginAddress();
    if (!origin) {
      errorMessage = "Falta configurar la dirección de origen en /admin/envios/tarifas";
    } else {
      const result = await createSkydropxLabel({
        orderNumber: order.orderNumber,
        origin,
        toAddress: address,
        customerName: order.customerName ?? order.customerEmail,
        customerPhone: order.customerPhone ?? undefined,
        customerEmail: order.customerEmail,
      });
      if (!result) {
        errorMessage = "Skydropx no está configurado (faltan las credenciales)";
      } else {
        await upsertShipment(orderId, {
          carrier: result.carrier,
          trackingNumber: result.trackingNumber,
          trackingUrl: result.trackingUrl ?? undefined,
          labelUrl: result.labelUrl ?? undefined,
          cost: result.cost,
          status: "LABEL_CREATED",
        });
      }
    }
  } catch (err) {
    console.error("[envios] Skydropx label generation failed:", err);
    errorMessage =
      err instanceof Error
        ? err.name === "TimeoutError" || err.name === "AbortError"
          ? "Skydropx no respondió a tiempo (timeout)"
          : err.message
        : "Error desconocido";
  }

  // Truncate — a raw provider error body can be huge and blow past the
  // URL length limit when passed through the redirect query string. The
  // full message is still in the server logs above.
  if (errorMessage && errorMessage.length > 300) {
    errorMessage = `${errorMessage.slice(0, 300)}… (ver logs de Vercel para el detalle completo)`;
  }

  revalidatePath("/admin/envios");
  revalidatePath(`/admin/envios/${orderId}`);
  redirect(
    `/admin/envios/${orderId}${errorMessage ? `?skydropx_error=${encodeURIComponent(errorMessage)}` : ""}`,
  );
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
