"use client";

import { useState, useTransition } from "react";
import { unlinkLoyverseVariantAction } from "@/app/admin/loyverse/actions";
import type { LinkedProduct } from "@/server/services/loyverse";

export function LoyverseLinkedList({ products }: { products: LinkedProduct[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function handleUnlink(variantId: string) {
    startTransition(async () => {
      await unlinkLoyverseVariantAction(variantId);
      setRemoved((prev) => new Set(prev).add(variantId));
    });
  }

  const visibleProducts = products
    .map((p) => ({ ...p, variants: p.variants.filter((v) => !removed.has(v.id)) }))
    .filter((p) => p.variants.length > 0);

  if (visibleProducts.length === 0) {
    return <p className="text-sm text-zinc-400">Todavía no hay productos vinculados.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {visibleProducts.map((product) => (
        <details key={product.productId} className="rounded-lg border border-zinc-200 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {product.productName}{" "}
            <span className="font-normal text-zinc-400">
              ({product.variants.length} variante{product.variants.length === 1 ? "" : "s"})
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {product.variants.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-1.5 text-sm first:border-t-0 first:pt-0"
              >
                <span className="text-zinc-600">
                  {v.color}/{v.size} → <span className="text-zinc-900">{v.loyverseLabel}</span>
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUnlink(v.id)}
                  className="shrink-0 text-xs text-red-600 underline disabled:opacity-40"
                >
                  Desvincular
                </button>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
