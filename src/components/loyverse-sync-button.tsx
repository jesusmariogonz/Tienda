"use client";

import { useState, useTransition } from "react";
import { syncLoyverseCatalogAction } from "@/app/admin/loyverse/actions";

export function LoyverseSyncButton() {
  const [result, setResult] = useState<{ matched: number; unmatched: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await syncLoyverseCatalogAction());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo sincronizar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Sincronizando…" : "Sincronizar catálogo con Loyverse"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-zinc-600">
          {result.matched} variantes emparejadas por SKU
          {result.unmatched > 0 && `, ${result.unmatched} sin coincidencia en esta tienda`} (de{" "}
          {result.total} en Loyverse).
        </p>
      )}
    </div>
  );
}
