"use client";

import { useState } from "react";
import { AdminImageUploader } from "./admin-image-uploader";
import { AdminVariantPicker } from "./admin-variant-picker";

export type ProductFormVariant = {
  id?: string;
  size: string;
  color: string;
  colorHex: string;
  colorHex2?: string;
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
  wholesaleEnabled?: boolean;
  wholesaleMinQty?: number | null;
  wholesaleDiscountPercent?: number | null;
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
    initialValues?.variants ?? [],
  );

  function updateVariant(index: number, patch: Partial<ProductFormVariant>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGenerate(
    combos: { size: string; color: string; colorHex: string }[],
  ) {
    setVariants((prev) => {
      const existingKeys = new Set(prev.map((v) => `${v.size}::${v.color}`));
      const additions = combos
        .filter((c) => !existingKeys.has(`${c.size}::${c.color}`))
        .map((c) => ({
          size: c.size,
          color: c.color,
          colorHex: c.colorHex,
          quantity: 25,
          lowStockThreshold: 5,
        }));
      return [...prev, ...additions];
    });
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

      <AdminImageUploader initialUrls={initialValues?.imageUrls} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initialValues?.active ?? true}
        />
        Producto activo (visible en la tienda)
      </label>

      <div className="flex flex-col gap-3 rounded-md border border-purple-200 bg-purple-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="wholesaleEnabled"
            defaultChecked={initialValues?.wholesaleEnabled ?? false}
          />
          Habilitar precio de mayoreo para este producto
        </label>
        <p className="text-xs text-zinc-500">
          Úsalo en tus productos de mayor precio/margen — los que realmente
          impulsan compras al mayoreo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Cantidad mínima (piezas)
            </label>
            <input
              type="number"
              min="2"
              name="wholesaleMinQty"
              defaultValue={initialValues?.wholesaleMinQty ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Descuento (%)</label>
            <input
              type="number"
              min="1"
              max="90"
              step="0.1"
              name="wholesaleDiscountPercent"
              defaultValue={initialValues?.wholesaleDiscountPercent ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Variantes (talla / color)</p>

        <AdminVariantPicker onGenerate={handleGenerate} />

        {variants.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="grid grid-cols-[3rem_3rem_5rem_1fr_6rem_6rem_auto] gap-2 px-2 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
              <span>Color</span>
              <span title="Para prendas de dos colores, ej. café/azul">Color 2</span>
              <span>Talla</span>
              <span>Nombre color</span>
              <span>Stock inicial</span>
              <span>Alerta stock bajo</span>
              <span />
            </div>
            {variants.map((v, i) => (
              <div
                key={i}
                className="grid grid-cols-[3rem_3rem_5rem_1fr_6rem_6rem_auto] items-center gap-2 rounded-md border border-zinc-200 p-2"
              >
                <input type="hidden" name="variantId" value={v.id ?? ""} />
                <input
                  type="color"
                  value={v.colorHex || "#000000"}
                  onChange={(e) => updateVariant(i, { colorHex: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-zinc-300"
                />
                <input type="hidden" name="variantColorHex" value={v.colorHex || ""} />
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={Boolean(v.colorHex2)}
                    title="Esta prenda es de dos colores"
                    onChange={(e) =>
                      updateVariant(i, { colorHex2: e.target.checked ? "#ffffff" : "" })
                    }
                  />
                  {v.colorHex2 && (
                    <input
                      type="color"
                      value={v.colorHex2}
                      onChange={(e) => updateVariant(i, { colorHex2: e.target.value })}
                      className="h-8 w-10 cursor-pointer rounded border border-zinc-300"
                    />
                  )}
                </div>
                <input type="hidden" name="variantColorHex2" value={v.colorHex2 || ""} />
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
                  title="Stock inicial: cuántas unidades hay disponibles ahora"
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
                  title="Alerta de stock bajo: a partir de cuántas unidades te avisamos por correo"
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
        )}
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
