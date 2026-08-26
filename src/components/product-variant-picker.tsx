"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { useCartUI } from "@/store/cart-ui";
import { formatPrice } from "@/lib/money";
import { resolveColorHex } from "@/lib/color-names";

const LOW_STOCK_THRESHOLD = 3;

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  colorHex2?: string | null;
  price: number;
  stock: number;
};

type Wholesale = { minQty: number; discountPercent: number };

export function ProductVariantPicker({
  productSlug,
  productName,
  image,
  basePrice,
  weightKg,
  variants,
  wholesale,
}: {
  productSlug: string;
  productName: string;
  image?: string;
  basePrice: number;
  weightKg?: number | null;
  variants: Variant[];
  wholesale?: Wholesale | null;
}) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const openCart = useCartUI((s) => s.open);

  const sizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size))),
    [variants],
  );
  const colors = useMemo(() => {
    const seen = new Map<string, { hex: string | null; hex2: string | null }>();
    for (const v of variants) {
      if (!seen.has(v.color)) seen.set(v.color, { hex: v.colorHex, hex2: v.colorHex2 ?? null });
    }
    return Array.from(seen.entries()).map(([name, { hex, hex2 }]) => ({
      name,
      hex: resolveColorHex(name, hex),
      hex2,
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

  const wholesaleActive = Boolean(wholesale && quantity >= wholesale.minQty);
  const unitPrice =
    selected && wholesaleActive && wholesale
      ? selected.price * (1 - wholesale.discountPercent / 100)
      : (selected?.price ?? basePrice);

  function selectColor(name: string) {
    setColor(name);
    setQuantity(1);
  }

  function selectSize(s: string) {
    setSize(s);
    setQuantity(1);
  }

  function handleAdd() {
    if (!selected || outOfStock) return;
    addItem({
      variantId: selected.id,
      productSlug,
      productName,
      image,
      size: selected.size,
      color: selected.color,
      price: unitPrice,
      quantity,
      maxQuantity: selected.stock,
      weightKg,
    });
    setAdded(true);
    setQuantity(1);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
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
      weightKg,
    });
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xl font-medium">
          {formatPrice(unitPrice)}
          {wholesaleActive && (
            <span className="ml-2 text-sm font-normal text-zinc-400 line-through">
              {formatPrice(selected?.price ?? basePrice)}
            </span>
          )}
        </p>
        {wholesale && (
          <p className="mt-1 text-xs text-purple-700">
            {wholesaleActive
              ? `¡Precio mayoreo aplicado! -${wholesale.discountPercent}%`
              : `Compra ${wholesale.minQty}+ piezas y obtén -${wholesale.discountPercent}%`}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">
          Color{color ? <span className="font-normal text-zinc-500"> · {color}</span> : null}
        </p>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => selectColor(c.name)}
              title={c.name}
              aria-label={c.name}
              className={`flex flex-col items-center gap-1 ${
                c.name === color ? "opacity-100" : "opacity-60"
              }`}
            >
              {c.hex && c.hex2 ? (
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    c.name === color ? "border-black" : "border-zinc-300"
                  }`}
                >
                  <span className="grid h-6 w-6 grid-cols-2 overflow-hidden rounded-full">
                    <span style={{ backgroundColor: c.hex }} />
                    <span style={{ backgroundColor: c.hex2 }} />
                  </span>
                </span>
              ) : c.hex ? (
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
              onClick={() => selectSize(s)}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className="flex-1 rounded-full border border-black py-3.5 text-sm font-medium disabled:opacity-40"
        >
          {added ? "Agregado" : "Agregar al carrito"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 rounded-full bg-black py-3.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Comprar ahora
        </button>
      </div>
    </div>
  );
}
