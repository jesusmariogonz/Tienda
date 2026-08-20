// Skydropx Pro API client. No-ops (returns null) when the OAuth2 client
// credentials aren't set, same pattern as Resend — lets the rest of the app
// call this safely before the client has real credentials configured.
//
// Skydropx authenticates via OAuth2 client_credentials (client_id + client
// secret → short-lived bearer token), not a single static API key. Endpoint
// and payload shapes below follow Skydropx's Pro API v1 (quotations +
// shipments) — confirm field names against the account's actual API docs
// if responses don't match, since provider APIs shift between plans.

const API_URL = process.env.SKYDROPX_API_URL ?? "https://api.skydropx.com/api/v1";
const AUTH_URL = process.env.SKYDROPX_AUTH_URL ?? "https://api.skydropx.com/api/v1/oauth/token";

function isConfigured() {
  return Boolean(process.env.SKYDROPX_CLIENT_ID && process.env.SKYDROPX_CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_CLIENT_ID,
      client_secret: process.env.SKYDROPX_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Skydropx auth → ${res.status}: ${body}`);
  }
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    // refresh a minute early
    expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

async function skydropxFetch(path: string, init: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
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
 * Skydropx isn't configured (no client credentials) so callers can fall
 * back to manual tracking entry. */
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
