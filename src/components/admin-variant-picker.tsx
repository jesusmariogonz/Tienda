"use client";

import { useState } from "react";
import type { ProductFormVariant } from "./admin-product-form";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Única"];
const COLOR_OPTIONS = [
  "Negro",
  "Blanco",
  "Gris",
  "Azul",
  "Rojo",
  "Verde",
  "Beige",
  "Vino",
];

export function AdminVariantPicker({
  onGenerate,
}: {
  onGenerate: (variants: { size: string; color: string }[]) => void;
}) {
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  }

  function addCustomSize() {
    if (customSize.trim() && !sizes.includes(customSize.trim())) {
      setSizes([...sizes, customSize.trim()]);
    }
    setCustomSize("");
  }

  function addCustomColor() {
    if (customColor.trim() && !colors.includes(customColor.trim())) {
      setColors([...colors, customColor.trim()]);
    }
    setCustomColor("");
  }

  function generate() {
    if (sizes.length === 0 || colors.length === 0) return;
    const combos = sizes.flatMap((size) =>
      colors.map((color) => ({ size, color })),
    );
    onGenerate(combos);
    setSizes([]);
    setColors([]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3">
      <p className="text-sm font-medium">Generar variantes por combinación</p>

      <div>
        <p className="mb-1 text-xs text-zinc-500">Tallas</p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...SIZE_OPTIONS, ...sizes])].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(sizes, setSizes, s)}
              className={`rounded-full border px-3 py-1 text-xs ${
                sizes.includes(s)
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Otra talla"
            className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={addCustomSize}
            className="text-xs text-zinc-600 underline"
          >
            Agregar
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs text-zinc-500">Colores</p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...COLOR_OPTIONS, ...colors])].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(colors, setColors, c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                colors.includes(c)
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Otro color"
            className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={addCustomColor}
            className="text-xs text-zinc-600 underline"
          >
            Agregar
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={sizes.length === 0 || colors.length === 0}
        className="w-fit rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-30"
      >
        Generar {sizes.length * colors.length || ""} variantes
      </button>
    </div>
  );
}

export type { ProductFormVariant };
