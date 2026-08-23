// Central place for environment-driven config so no domain/URL is hardcoded.
// Set NEXT_PUBLIC_APP_URL per environment (e.g. tienda.844digital.com today,
// a custom domain later) without touching application code.

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const appName = process.env.APP_NAME ?? "Dupe Fit";

export const currency = process.env.STORE_CURRENCY ?? "MXN";

// Assumed weight (kg) per unit for products without a configured weight, so
// shipping quotes still work before every product has one set.
export const DEFAULT_ITEM_WEIGHT_KG = 0.3;
