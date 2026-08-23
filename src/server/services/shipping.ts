import { prisma } from "@/lib/prisma";
import {
  quoteSkydropxShipment,
  getSkydropxQuotation,
  skydropxConfigured,
  type ShippingAddress,
  type SkydropxRate,
} from "@/lib/skydropx";

export type OriginAddress = {
  company: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
};

export async function getShippingSettings() {
  const settings = await prisma.shippingSettings.findUnique({ where: { id: "default" } });
  return {
    flatRate: settings ? Number(settings.flatRate) : 0,
    freeOverAmount:
      settings?.freeOverAmount !== null && settings?.freeOverAmount !== undefined
        ? Number(settings.freeOverAmount)
        : null,
    origin: settings
      ? {
          company: settings.originCompany ?? "",
          name: settings.originName ?? "",
          street: settings.originStreet ?? "",
          city: settings.originCity ?? "",
          state: settings.originState ?? "",
          zip: settings.originZip ?? "",
          phone: settings.originPhone ?? "",
          email: settings.originEmail ?? "",
        }
      : null,
  };
}

export async function computeShippingCost(subtotal: number) {
  const { flatRate, freeOverAmount } = await getShippingSettings();
  if (freeOverAmount !== null && subtotal >= freeOverAmount) return 0;
  return flatRate;
}

export type ShippingQuoteOptions =
  | { source: "skydropx"; quotationId: string; rates: SkydropxRate[] }
  | { source: "flat"; cost: number };

/** Quotes shipping for the checkout page: real Skydropx rates for the
 * customer's address when it's configured and the address is complete
 * enough, falling back to the flat rate otherwise (not configured, no
 * origin set, address incomplete, or Skydropx errored/returned nothing). */
export async function quoteShippingOptions(
  address: ShippingAddress,
  subtotal: number,
): Promise<ShippingQuoteOptions> {
  const flatCost = await computeShippingCost(subtotal);

  if (!skydropxConfigured() || !address.street || !address.zip) {
    return { source: "flat", cost: flatCost };
  }

  const origin = await getOriginAddress();
  if (!origin) return { source: "flat", cost: flatCost };

  try {
    const quote = await quoteSkydropxShipment({ origin, toAddress: address });
    if (!quote || quote.rates.length === 0) return { source: "flat", cost: flatCost };
    return { source: "skydropx", quotationId: quote.quotationId, rates: quote.rates };
  } catch (err) {
    console.error("[shipping] Skydropx checkout quote failed, falling back to flat rate:", err);
    return { source: "flat", cost: flatCost };
  }
}

export type ShippingSelection = { quotationId: string; rateId: string };

/** Re-verifies a rate the customer picked at checkout against Skydropx
 * itself — the client can only choose which rateId to use, never the
 * price; the authoritative cost always comes from re-fetching the
 * quotation here. Falls back to the flat rate if the quotation/rate can no
 * longer be found (e.g. it expired between quoting and paying). */
export async function resolveShippingCost(
  selection: ShippingSelection | undefined,
  subtotal: number,
): Promise<{ cost: number; quotationId: string | null; rates: SkydropxRate[] | null }> {
  if (!selection) {
    return { cost: await computeShippingCost(subtotal), quotationId: null, rates: null };
  }

  const quotation = await getSkydropxQuotation(selection.quotationId);
  const rate = quotation?.rates.find((r) => r.id === selection.rateId);
  if (!quotation || !rate) {
    return { cost: await computeShippingCost(subtotal), quotationId: null, rates: null };
  }

  return { cost: rate.total, quotationId: quotation.quotationId, rates: quotation.rates };
}

export async function getOriginAddress(): Promise<OriginAddress | null> {
  const { origin } = await getShippingSettings();
  if (!origin?.street || !origin.zip) return null;
  return origin as OriginAddress;
}

export async function saveShippingSettings(
  flatRate: number,
  freeOverAmount: number | null,
  origin: OriginAddress,
) {
  return prisma.shippingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      flatRate,
      freeOverAmount,
      originCompany: origin.company || null,
      originName: origin.name || null,
      originStreet: origin.street || null,
      originCity: origin.city || null,
      originState: origin.state || null,
      originZip: origin.zip || null,
      originPhone: origin.phone || null,
      originEmail: origin.email || null,
    },
    update: {
      flatRate,
      freeOverAmount,
      originCompany: origin.company || null,
      originName: origin.name || null,
      originStreet: origin.street || null,
      originCity: origin.city || null,
      originState: origin.state || null,
      originZip: origin.zip || null,
      originPhone: origin.phone || null,
      originEmail: origin.email || null,
    },
  });
}
