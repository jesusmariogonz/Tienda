// Skydropx Pro API client. No-ops (returns null) when SKYDROPX_API_KEY is
// unset, same pattern as Resend — lets the rest of the app call this safely
// before the client has a real account/key.
//
// Endpoint/payload shapes follow Skydropx's Pro API v1 (quotations +
// shipments). Confirm field names against the account's actual API docs
// once real credentials are issued — provider APIs change payload shape
// between plans/versions more often than most.

const API_URL = process.env.SKYDROPX_API_URL ?? "https://api.skydropx.com/api/v1";

function isConfigured() {
  return Boolean(process.env.SKYDROPX_API_KEY);
}

async function skydropxFetch(path: string, init: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SKYDROPX_API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Skydropx ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

export type ShippingAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  references?: string;
};

export type SkydropxLabelResult = {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  cost: number;
};

/** Creates a shipment + label for an order via Skydropx. Returns null if
 * Skydropx isn't configured (no API key) so callers can fall back to
 * manual tracking entry. */
export async function createSkydropxLabel(params: {
  orderNumber: string;
  toAddress: ShippingAddress;
  customerName: string;
  customerPhone?: string;
  packageWeightKg?: number;
}): Promise<SkydropxLabelResult | null> {
  if (!isConfigured()) return null;

  const quotation = await skydropxFetch("/quotations", {
    method: "POST",
    body: JSON.stringify({
      address_to: {
        street1: params.toAddress.street,
        city: params.toAddress.city,
        province: params.toAddress.state,
        zip: params.toAddress.zip,
        country_code: "MX",
      },
      parcel: {
        weight: params.packageWeightKg ?? 1,
      },
    }),
  });

  const rateId = quotation?.rates?.[0]?.id;
  if (!rateId) throw new Error("Skydropx no devolvió tarifas disponibles");

  const shipment = await skydropxFetch("/shipments", {
    method: "POST",
    body: JSON.stringify({
      rate_id: rateId,
      reference: params.orderNumber,
      address_to: {
        name: params.customerName,
        phone: params.customerPhone,
        street1: params.toAddress.street,
        city: params.toAddress.city,
        province: params.toAddress.state,
        zip: params.toAddress.zip,
        country_code: "MX",
      },
    }),
  });

  return {
    carrier: shipment.carrier ?? quotation?.rates?.[0]?.provider ?? "Skydropx",
    trackingNumber: shipment.tracking_number,
    trackingUrl: shipment.tracking_url ?? null,
    labelUrl: shipment.label_url ?? null,
    cost: Number(shipment.cost ?? quotation?.rates?.[0]?.total ?? 0),
  };
}

export function skydropxConfigured() {
  return isConfigured();
}
