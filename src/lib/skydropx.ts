// Skydropx Pro API client. No-ops (returns null) when the OAuth2 client
// credentials aren't set, same pattern as Resend — lets the rest of the app
// call this safely before the client has real credentials configured.
//
// Confirmed against Skydropx's own API docs (Aug 2026):
// - Host: api-pro.skydropx.com
// - Auth: POST /api/v1/oauth/token, client_credentials grant,
//   application/x-www-form-urlencoded body.
// - Shipment: POST /api/v1/rate/shipments/ creates a label in one call
//   without a separate quotation step (Skydropx picks/prices the rate
//   internally). Returns master_tracking_number + label_url directly.

const API_URL = process.env.SKYDROPX_API_URL ?? "https://api-pro.skydropx.com/api/v1";
const AUTH_URL =
  process.env.SKYDROPX_AUTH_URL ?? "https://api-pro.skydropx.com/api/v1/oauth/token";

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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_CLIENT_ID!,
      client_secret: process.env.SKYDROPX_CLIENT_SECRET!,
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
    expiresAt: Date.now() + (Number(data.expires_in ?? 7200) - 60) * 1000,
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

export type SkydropxLabelResult = {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  cost: number;
};

function skydropxAddress(a: {
  name: string;
  company: string;
  phone: string;
  email: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  reference?: string;
}) {
  return {
    name: a.name,
    company: a.company,
    phone: a.phone,
    email: a.email,
    street1: a.street ?? "",
    area_level2: a.city ?? "",
    area_level1: a.state ?? "",
    area_level3: a.city ?? "",
    postal_code: a.zip ?? "",
    country_code: "MX",
    reference: a.reference ?? "N/A",
  };
}

/** Creates a shipment + label for an order via Skydropx in a single call
 * (no separate quotation step — Skydropx prices it internally). Returns
 * null if Skydropx isn't configured (no client credentials) so callers can
 * fall back to manual tracking entry. */
export async function createSkydropxLabel(params: {
  orderNumber: string;
  origin: OriginAddress;
  toAddress: ShippingAddress;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  packageWeightKg?: number;
}): Promise<SkydropxLabelResult | null> {
  if (!isConfigured()) return null;

  const shipment = await skydropxFetch("/rate/shipments/", {
    method: "POST",
    body: JSON.stringify({
      quotation: {
        carrier: {
          name: process.env.SKYDROPX_CARRIER ?? "dhl",
          service_name: process.env.SKYDROPX_SERVICE ?? "express_ltl",
        },
        address_from: skydropxAddress({
          name: params.origin.name,
          company: params.origin.company,
          phone: params.origin.phone,
          email: params.origin.email,
          street: params.origin.street,
          city: params.origin.city,
          state: params.origin.state,
          zip: params.origin.zip,
        }),
        address_to: skydropxAddress({
          name: params.customerName,
          company: "N/A",
          phone: params.customerPhone ?? "0000000000",
          email: params.customerEmail,
          street: params.toAddress.street,
          city: params.toAddress.city,
          state: params.toAddress.state,
          zip: params.toAddress.zip,
          reference: params.toAddress.references,
        }),
        parcels: [
          {
            weight: params.packageWeightKg ?? 1,
            height: 10,
            width: 20,
            length: 30,
          },
        ],
      },
    }),
  });

  if (shipment.error_message_detail) {
    throw new Error(shipment.error_message_detail);
  }
  if (!shipment.master_tracking_number) {
    throw new Error(
      shipment.rate?.error_messages?.join(", ") ?? "Skydropx no devolvió número de guía",
    );
  }

  return {
    carrier: shipment.rate?.provider_display_name ?? "Skydropx",
    trackingNumber: shipment.master_tracking_number,
    trackingUrl: null,
    labelUrl: shipment.label_url ?? null,
    cost: Number(shipment.rate?.total ?? 0),
  };
}

export function skydropxConfigured() {
  return isConfigured();
}
