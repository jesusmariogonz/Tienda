"use client";

import { useMemo, useState, useTransition } from "react";
import { linkLoyverseItemAction, linkLoyverseVariantAction } from "@/app/admin/loyverse/actions";
import type {
  MappingLoyverseItem,
  MappingProduct,
  MappingVariant,
} from "@/server/services/loyverse";

export function LoyverseMappingClient({
  products,
  loyverseItems,
}: {
  products: MappingProduct[];
  loyverseItems: MappingLoyverseItem[];
}) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [unresolvedByProduct, setUnresolvedByProduct] = useState<
    Record<string, { variants: MappingVariant[]; itemId: string }>
  >({});
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.productId, p.suggestedItemId ?? ""])),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const itemsById = useMemo(
    () => new Map(loyverseItems.map((i) => [i.itemId, i])),
    [loyverseItems],
  );

  function handleLinkProduct(product: MappingProduct) {
    const loyverseItemId = selection[product.productId];
    if (!loyverseItemId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await linkLoyverseItemAction(product.productId, loyverseItemId);
        if (result.unresolved.length > 0) {
          setUnresolvedByProduct((prev) => ({
            ...prev,
            [product.productId]: { variants: result.unresolved, itemId: loyverseItemId },
          }));
        } else {
          setResolved((prev) => new Set(prev).add(product.productId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo vincular");
      }
    });
  }

  function handleLinkVariant(productId: string, ourVariantId: string, loyverseVariantId: string) {
    if (!loyverseVariantId) return;
    setError(null);
    startTransition(async () => {
      try {
        await linkLoyverseVariantAction(ourVariantId, loyverseVariantId);
        setUnresolvedByProduct((prev) => {
          const entry = prev[productId];
          if (!entry) return prev;
          const remaining = entry.variants.filter((v) => v.id !== ourVariantId);
          const next = { ...prev };
          if (remaining.length === 0) {
            delete next[productId];
            setResolved((r) => new Set(r).add(productId));
          } else {
            next[productId] = { ...entry, variants: remaining };
          }
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo vincular");
      }
    });
  }

  const pending = products.filter((p) => !resolved.has(p.productId));

  if (pending.length === 0) {
    return (
      <p className="text-sm text-green-700">
        Todos los productos activos ya están vinculados con Loyverse.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pending.map((product) => {
        const unresolved = unresolvedByProduct[product.productId];
        const suggested = product.suggestedItemId ? itemsById.get(product.suggestedItemId) : null;

        return (
          <div key={product.productId} className="rounded-lg border border-zinc-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{product.productName}</p>
                <p className="text-xs text-zinc-500">{product.variants.length} variantes</p>
              </div>

              {!unresolved && (
                <div className="flex items-center gap-2">
                  <select
                    value={selection[product.productId] ?? ""}
                    onChange={(e) =>
                      setSelection((prev) => ({ ...prev, [product.productId]: e.target.value }))
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Elegir producto en Loyverse…</option>
                    {loyverseItems.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.itemName} ({item.variants.length} variantes)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isPending || !selection[product.productId]}
                    onClick={() => handleLinkProduct(product)}
                    className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Vincular
                  </button>
                </div>
              )}
            </div>

            {suggested && !unresolved && (
              <p className="mt-1 text-xs text-zinc-400">
                Sugerido: &quot;{suggested.itemName}&quot;
              </p>
            )}

            {unresolved && (
              <div className="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-2">
                <p className="text-xs text-amber-700">
                  {unresolved.variants.length} variante(s) no se pudieron emparejar solas —
                  elígelas a mano:
                </p>
                {unresolved.variants.map((v) => {
                  const item = itemsById.get(unresolved.itemId);
                  return (
                    <div key={v.id} className="flex items-center gap-2 text-sm">
                      <span className="w-32 shrink-0 text-zinc-600">
                        {v.color}/{v.size}
                      </span>
                      <select
                        onChange={(e) =>
                          handleLinkVariant(product.productId, v.id, e.target.value)
                        }
                        defaultValue=""
                        className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      >
                        <option value="">Elegir variante en Loyverse…</option>
                        {item?.variants.map((lv) => (
                          <option key={lv.variantId} value={lv.variantId}>
                            {lv.optionLabel ?? lv.sku ?? lv.variantId}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
