"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { resendOrderConfirmationEmail } from "@/server/services/orders";

export async function resendConfirmationAction(orderId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };

  try {
    await resendOrderConfirmationEmail(orderId);
    revalidatePath("/admin/pedidos");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo reenviar el correo" };
  }
}
