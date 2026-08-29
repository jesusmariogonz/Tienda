"use client";

import { useState, useTransition } from "react";
import { resendConfirmationAction } from "@/app/admin/pedidos/actions";

export function ResendConfirmationButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<"idle" | "sent" | string>("idle");

  function handleClick() {
    setResult("idle");
    startTransition(async () => {
      const res = await resendConfirmationAction(orderId);
      setResult(res.error ?? "sent");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-zinc-600 underline disabled:opacity-40"
      >
        {isPending ? "Enviando…" : "Reenviar confirmación"}
      </button>
      {result === "sent" && <span className="text-xs text-green-700">Enviado ✓</span>}
      {result !== "idle" && result !== "sent" && (
        <span className="max-w-[220px] text-right text-xs text-red-600">{result}</span>
      )}
    </div>
  );
}
