"use client";

import { useState } from "react";
import type { ProductFormVariant } from "./admin-product-form";

const SIZE_OPTIONS = ["Única", "XS", "S", "M", "L", "XL", "XXL"];
const COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#ffffff" },
  { name: "Gris claro", hex: "#a3a3a3" },
  { name: "Gris oscuro", hex: "#4b5563" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Beige", hex: "#d6c7a1" },
  { name: "Vino", hex: "#7f1d1d" },
];

export function AdminVariantPicker({
  onGenerate,
}: {
  onGenerate: (variants: { size: string; color: string; colorHex: string }[]) => void;
}) {
  // Most clients here only sell "unitalla" — pre-select it so the common
  // case needs zero extra clicks; sizes stay fully editable either way.
  const [sizes, setSizes] = useState<string[]>(["Única"]);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#000000");

  function toggleSize(value: string) {
    setSizes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function toggleColor(color: { name: string; hex: string }) {
    setColors((prev) =>
      prev.some((c) => c.name === color.name)
        ? prev.filter((c) => c.name !== color.name)
        : [...prev, color],
    );
  }

  function updateColorHex(name: string, hex: string) {
    setColors((prev) => prev.map((c) => (c.name === name ? { ...c, hex } : c)));
  }

  function addCustomSize() {
    if (customSize.trim() && !sizes.includes(customSize.trim())) {
      setSizes([...sizes, customSize.trim()]);
    }
    setCustomSize("");
  }

  function addCustomColor() {
    const name = customColorName.trim();
    if (name && !colors.some((c) => c.name === name)) {
      setColors([...colors, { name, hex: customColorHex }]);
    }
    setCustomColorName("");
    setCustomColorHex("#000000");
  }

  function generate() {
    if (sizes.length === 0 || colors.length === 0) return;
    const combos = sizes.flatMap((size) =>
      colors.map((color) => ({ size, color: color.name, colorHex: color.hex })),
    );
    onGenerate(combos);
    setColors([]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3">
      <p className="text-sm font-medium">Generar variantes por combinación</p>

      <div>
        <p className="mb-1 text-xs text-zinc-500">
          Tallas — &quot;Única&quot; ya está lista si el producto es unitalla
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...SIZE_OPTIONS, ...sizes])].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
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
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => {
            const active = colors.some((sel) => sel.name === c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleColor(c)}
                title={c.name}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  active ? "border-black" : "border-zinc-200"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active && (
                  <span
                    className={c.name === "Blanco" ? "text-black" : "text-white"}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {colors.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {colors.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColorHex(c.name, e.target.value)}
                  className="h-6 w-8 cursor-pointer rounded border border-zinc-300"
                />
                <span>{c.name}</span>
                <span className="text-zinc-400">{c.hex}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            placeholder="Otro color (ej. Rojo vino)"
            className="w-40 rounded-md border border-zinc-300 px-2 py-1 text-xs"
          />
          <input
            type="color"
            value={customColorHex}
            onChange={(e) => setCustomColorHex(e.target.value)}
            className="h-7 w-9 cursor-pointer rounded border border-zinc-300"
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
