"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/money";
import { resolveColorHex } from "@/lib/color-names";

const LOW_STOCK_THRESHOLD = 3;

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  price: number;
  stock: number;
};

export function ProductVariantPicker({
  productSlug,
  productName,
  image,
  basePrice,
  variants,
}: {
  productSlug: string;
  productName: string;
  image?: string;
  basePrice: number;
  variants: Variant[];
}) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);

  const sizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size))),
    [variants],
  );
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const v of variants) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
    return Array.from(seen.entries()).map(([name, hex]) => ({
      name,
      hex: resolveColorHex(name, hex),
    }));
  }, [variants]);

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.size === size && v.color === color);
  const outOfStock = !selected || selected.stock <= 0;
  const isLowStock = !!selected && selected.stock > 0 && selected.stock <= LOW_STOCK_THRESHOLD;
  const maxQuantity = selected?.stock ?? 1;

  function handleAdd() {
    if (!selected || outOfStock) return;
    addItem({
      variantId: selected.id,
      productSlug,
      productName,
      image,
      size: selected.size,
      color: selected.color,
      price: selected.price,
      quantity,
      maxQuantity: selected.stock,
    });
    setAdded(true);
    setQuantity(1);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xl font-medium">
        {formatPrice(selected?.price ?? basePrice)}
      </p>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">Color</p>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              title={c.name}
              aria-label={c.name}
              className={`flex flex-col items-center gap-1 ${
                c.name === color ? "opacity-100" : "opacity-60"
              }`}
            >
              {c.hex ? (
                <span
                  className={`h-8 w-8 rounded-full border-2 ${
                    c.name === color ? "border-black" : "border-zinc-300"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ) : (
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    c.name === color
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 text-zinc-700"
                  }`}
                >
                  {c.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">Talla</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                s === size
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">Cantidad</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={outOfStock}
            className="h-9 w-9 rounded-full border border-zinc-300 text-lg disabled:opacity-30"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={outOfStock || quantity >= maxQuantity}
            className="h-9 w-9 rounded-full border border-zinc-300 text-lg disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {isLowStock && (
        <div className="rounded-md border-2 border-red-600 bg-red-50 px-4 py-3">
          <p className="text-sm font-bold text-red-600 uppercase">
            ¡Últimas unidades!
          </p>
          <p className="text-sm text-red-600">
            Solo quedan {selected.stock} disponibles — vuela antes de que se agote.
          </p>
        </div>
      )}
      {!isLowStock && selected && selected.stock > 0 && selected.stock <= 10 && (
        <p className="text-sm text-amber-600">
          Quedan {selected.stock} disponibles
        </p>
      )}
      {outOfStock && <p className="text-sm text-red-600">Variante agotada</p>}

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {added ? "Agregado" : "Agregar al carrito"}
      </button>

      <button
        type="button"
        onClick={() => router.push("/carrito")}
        className="w-full rounded-full border border-black py-3.5 text-sm font-medium"
      >
        Ver carrito
      </button>
    </div>
  );
}
