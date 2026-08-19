"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/money";

type Variant = {
  id: string;
  size: string;
  color: string;
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
  const colors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color))),
    [variants],
  );

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.size === size && v.color === color);
  const outOfStock = !selected || selected.stock <= 0;

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
      quantity: 1,
      maxQuantity: selected.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xl font-medium">
        {formatPrice(selected?.price ?? basePrice)}
      </p>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">Color</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                c === color
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              {c}
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

      {selected && selected.stock > 0 && selected.stock <= 5 && (
        <p className="text-sm text-amber-600">
          Quedan {selected.stock} disponibles
        </p>
      )}
      {outOfStock && (
        <p className="text-sm text-red-600">Variante agotada</p>
      )}

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
