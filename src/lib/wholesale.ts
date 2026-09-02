// Pure calculation shared by the client (cart progress bar) and the server
// (actual charge) so the discount preview always matches what gets billed.

export type WholesaleSettings = {
  minQty: number;
  discountPercent: number;
};

export const DEFAULT_WHOLESALE_SETTINGS: WholesaleSettings = {
  minQty: 8,
  discountPercent: 10,
};

export function computeCartWholesaleDiscount(
  subtotal: number,
  totalQuantity: number,
  settings: WholesaleSettings,
) {
  if (settings.minQty <= 0 || totalQuantity < settings.minQty) return 0;
  return subtotal * (settings.discountPercent / 100);
}
