"use client";

import { useState, useTransition } from "react";
import { markOrderPaidAction } from "@/app/admin/actions";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<"idle" | "done" | string>("idle");

  function handleClick() {
    if (
      !confirm(
        "¿Confirmas que este cliente SÍ pagó (verificado en Stripe/Mercado Pago)? Esto descuenta el inventario, manda el correo de confirmación y registra la venta como si el pago se hubiera confirmado normalmente.",
      )
    ) {
      return;
    }
    setResult("idle");
    startTransition(async () => {
      const res = await markOrderPaidAction(orderId);
      setResult(res.error ?? "done");
    });
  }

  if (result === "done") {
    return <span className="text-xs text-green-700">Marcada como pagada ✓</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-green-700 underline disabled:opacity-40"
      >
        {isPending ? "Confirmando…" : "Marcar como pagada"}
      </button>
      {result !== "idle" && result !== "done" && (
        <span className="max-w-[220px] text-xs text-red-600">{result}</span>
      )}
    </div>
  );
}
