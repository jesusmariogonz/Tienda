"use client";

import { useWholesaleSettings } from "@/hooks/use-wholesale-settings";
import { computeCartWholesaleDiscount } from "@/lib/wholesale";
import { formatPrice } from "@/lib/money";

export function WholesaleProgress({
  totalQuantity,
  subtotal,
}: {
  totalQuantity: number;
  subtotal: number;
}) {
  const settings = useWholesaleSettings();
  if (totalQuantity === 0) return null;

  const reached = totalQuantity >= settings.minQty;
  const pct = Math.min(100, (totalQuantity / settings.minQty) * 100);
  const discount = computeCartWholesaleDiscount(subtotal, totalQuantity, settings);

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5">
      <p className="text-xs font-medium text-sky-900">
        {reached ? (
          <>
            ¡Alcanzaste el mínimo de mayoreo! -{settings.discountPercent}% aplicado
            automáticamente ({formatPrice(discount)} de descuento).
          </>
        ) : (
          <>
            Te faltan{" "}
            <strong>{settings.minQty - totalQuantity}</strong>{" "}
            {settings.minQty - totalQuantity === 1 ? "pieza" : "piezas"} para
            desbloquear -{settings.discountPercent}% de mayoreo (mínimo{" "}
            {settings.minQty} piezas, cualquier modelo o color).
          </>
        )}
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
