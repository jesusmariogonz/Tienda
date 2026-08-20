"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { upsertShipment } from "@/server/services/shipments";
import { saveShippingSettings } from "@/server/services/shipping";
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
    const result = await createSkydropxLabel({
      orderNumber: order.orderNumber,
      toAddress: address,
      customerName: order.customerName ?? order.customerEmail,
      customerPhone: order.customerPhone ?? undefined,
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
  } catch (err) {
    console.error("[envios] Skydropx label generation failed:", err);
    errorMessage = err instanceof Error ? err.message : "Error desconocido";
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

  await saveShippingSettings(flatRate, freeOverAmount);
  revalidatePath("/admin/envios/tarifas");
  redirect("/admin/envios/tarifas");
}
