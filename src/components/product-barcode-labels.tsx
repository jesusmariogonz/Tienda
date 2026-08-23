"use client";

import { BarcodeSvg } from "./barcode-svg";

type Variant = {
  id: string;
  sku: string;
  color: string;
  size: string;
};

export function ProductBarcodeLabels({
  productName,
  variants,
}: {
  productName: string;
  variants: Variant[];
}) {
  if (variants.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Códigos de barras</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium"
        >
          Imprimir etiquetas
        </button>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Cada variante tiene su propio código (su SKU) — pégalo en la prenda y
        escanéalo en el punto de venta en vez de buscarla a mano.
      </p>

      <div id="barcode-labels" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {variants.map((v) => (
          <div
            key={v.id}
            className="barcode-label flex flex-col items-center gap-1 rounded-md border border-zinc-200 p-2 text-center"
          >
            <p className="text-[11px] leading-tight font-medium">{productName}</p>
            <p className="text-[10px] text-zinc-500">
              {v.color}/{v.size}
            </p>
            <BarcodeSvg value={v.sku} />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #barcode-labels,
          #barcode-labels * {
            visibility: visible;
          }
          #barcode-labels {
            position: absolute;
            top: 0;
            left: 0;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }
          .barcode-label {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
