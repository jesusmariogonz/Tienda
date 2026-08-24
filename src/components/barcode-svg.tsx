"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

/** Renders a Code128 barcode (readable by any standard USB/handheld
 * scanner) encoding the given value — used for each variant's SKU so it
 * can be printed on a label and scanned at the POS instead of typed. */
export function BarcodeSvg({
  value,
  height = 40,
  width = 1.6,
  fontSize = 12,
}: {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width,
        fontSize,
        margin: 4,
      });
      setError(false);
    } catch (err) {
      // CODE128 can't encode every character (e.g. accents) — never let a
      // bad SKU take down the whole page, just show a fallback instead.
      console.error("[barcode] failed to render", value, err);
      setError(true);
    }
  }, [value, height, width, fontSize]);

  if (error) {
    return (
      <p className="text-xs text-red-600">
        No se pudo generar el código para &quot;{value}&quot;
      </p>
    );
  }

  return <svg ref={ref} />;
}
