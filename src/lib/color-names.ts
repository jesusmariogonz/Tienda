// Fallback hex for common color names in Spanish, used when a variant has
// no colorHex set explicitly (e.g. products created before that field
// existed, or added without picking a hex) so the storefront still shows a
// swatch dot instead of falling back to a plain text chip.
const COLOR_NAME_HEX: Record<string, string> = {
  negro: "#000000",
  blanco: "#ffffff",
  "gris": "#9ca3af",
  "gris claro": "#a3a3a3",
  "gris oscuro": "#4b5563",
  azul: "#2563eb",
  "azul marino": "#1e3a8a",
  "azul cielo": "#38bdf8",
  rojo: "#dc2626",
  verde: "#16a34a",
  "verde olivo": "#556b2f",
  amarillo: "#eab308",
  naranja: "#ea580c",
  morado: "#7c3aed",
  rosa: "#ec4899",
  beige: "#d6c7a1",
  vino: "#7f1d1d",
  cafe: "#7c4a2d",
  café: "#7c4a2d",
  dorado: "#c9a227",
  plateado: "#c0c0c0",
};

export function resolveColorHex(name: string, explicitHex?: string | null) {
  if (explicitHex) return explicitHex;
  return COLOR_NAME_HEX[name.trim().toLowerCase()] ?? null;
}
