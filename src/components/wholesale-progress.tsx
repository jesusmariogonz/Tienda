"use client";

import { useEffect, useRef, useState } from "react";
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
  const reached = totalQuantity >= settings.minQty;
  const wasReached = useRef(reached);
  const [justReached, setJustReached] = useState(false);

  useEffect(() => {
    if (reached && !wasReached.current) {
      setJustReached(true);
      wasReached.current = true;
      const timeout = setTimeout(() => setJustReached(false), 900);
      return () => clearTimeout(timeout);
    }
    wasReached.current = reached;
  }, [reached]);

  if (totalQuantity === 0) return null;

  const pct = Math.min(100, (totalQuantity / settings.minQty) * 100);
  const discount = computeCartWholesaleDiscount(subtotal, totalQuantity, settings);

  return (
    <div
      className={`rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 transition-transform ${
        justReached ? "animate-[wholesale-pop_0.5s_ease-out]" : ""
      }`}
    >
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
          className={`h-full rounded-full bg-sky-600 transition-all duration-500 ${
            justReached ? "animate-[wholesale-glow_0.9s_ease-out]" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <style jsx>{`
        @keyframes wholesale-pop {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.03);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes wholesale-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.6);
          }
          100% {
            box-shadow: 0 0 0 6px rgba(2, 132, 199, 0);
          }
        }
      `}</style>
    </div>
  );
}
