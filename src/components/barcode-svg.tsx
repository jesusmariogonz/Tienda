"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      height,
      width,
      fontSize,
      margin: 4,
    });
  }, [value, height, width, fontSize]);

  return <svg ref={ref} />;
}
