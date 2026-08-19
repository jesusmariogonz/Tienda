"use client";

import { useState } from "react";

export type ProductFormVariant = {
  id?: string;
  size: string;
  color: string;
  quantity: number;
  lowStockThreshold: number;
};

export type ProductFormValues = {
  name: string;
  description: string;
  basePrice: number;
  categoryName: string;
  active: boolean;
  imageUrls: string[];
  variants: ProductFormVariant[];
};

export function AdminProductForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initialValues?: ProductFormValues;
  submitLabel: string;
}) {
  const [variants, setVariants] = useState<ProductFormVariant[]>(
    initialValues?.variants ?? [
      { size: "", color: "", quantity: 0, lowStockThreshold: 5 },
    ],
  );

  function updateVariant(index: number, patch: Partial<ProductFormVariant>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", quantity: 0, lowStockThreshold: 5 },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Nombre</label>
        <input
          name="name"
          required
          defaultValue={initialValues?.name}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initialValues?.description}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Precio base (MXN)
          </label>
          <input
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initialValues?.basePrice}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Categoría</label>
          <input
            name="categoryName"
            defaultValue={initialValues?.categoryName}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Imágenes (una URL por línea)
        </label>
        <textarea
          name="imageUrls"
          rows={3}
          defaultValue={initialValues?.imageUrls.join("\n")}
          placeholder="https://…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initialValues?.active ?? true}
        />
        Producto activo (visible en la tienda)
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Variantes (talla / color)</p>
          <button
            type="button"
            onClick={addVariant}
            className="text-sm text-zinc-600 underline"
          >
            + Agregar variante
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {variants.map((v, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_5rem_5rem_auto] items-center gap-2 rounded-md border border-zinc-200 p-2"
            >
              {v.id && <input type="hidden" name="variantId" value={v.id} />}
              {!v.id && <input type="hidden" name="variantId" value="" />}
              <input
                name="variantSize"
                placeholder="Talla"
                required
                value={v.size}
                onChange={(e) => updateVariant(i, { size: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                name="variantColor"
                placeholder="Color"
                required
                value={v.color}
                onChange={(e) => updateVariant(i, { color: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                name="variantQuantity"
                type="number"
                min="0"
                placeholder="Stock"
                required
                value={v.quantity}
                onChange={(e) =>
                  updateVariant(i, { quantity: Number(e.target.value) })
                }
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                name="variantThreshold"
                type="number"
                min="0"
                placeholder="Alerta"
                required
                value={v.lowStockThreshold}
                onChange={(e) =>
                  updateVariant(i, { lowStockThreshold: Number(e.target.value) })
                }
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeVariant(i)}
                className="text-xs text-red-600"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-fit rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
