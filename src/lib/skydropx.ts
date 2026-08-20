// Skydropx Pro API client. No-ops (returns null) when the OAuth2 client
// credentials aren't set, same pattern as Resend — lets the rest of the app
// call this safely before the client has real credentials configured.
//
// Confirmed against Skydropx's own docs + their live test console (Aug
// 2026): host is pro.skydropx.com. Real flow is 3 steps, per their own
// "Guía para crear envío":
//   1. POST /api/v1/quotations       → create a quotation
//   2. GET  /api/v1/quotations/:id   → poll until is_completed, pick a rate
//   3. POST /api/v1/shipments        → { quotation_id, rate_id } → label
// (The single-call POST /rate/shipments/ endpoint documented elsewhere
// consistently 500s — not used.)

const API_URL = process.env.SKYDROPX_API_URL ?? "https://pro.skydropx.com/api/v1";
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
    expiresAt: Date.now() + (Number(data.expires_in ?? 7200) - 60) * 1000,
  };
  return cachedToken.value;
}

async function skydropxFetch(path: string, init: RequestInit = {}) {
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

const READY_RATE_STATUSES = new Set(["approved", "price_found_internal", "price_found_external"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Creates a shipment + label for an order via Skydropx following their
 * documented 3-step flow (quote → poll for rates → book a rate). Returns
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

  const addressFrom = skydropxAddress({
    name: params.origin.name,
    company: params.origin.company,
    phone: params.origin.phone,
    email: params.origin.email,
    street: params.origin.street,
    city: params.origin.city,
    state: params.origin.state,
    zip: params.origin.zip,
  });
  const addressTo = skydropxAddress({
    name: params.customerName,
    company: "N/A",
    phone: params.customerPhone ?? "0000000000",
    email: params.customerEmail,
    street: params.toAddress.street,
    city: params.toAddress.city,
    state: params.toAddress.state,
    zip: params.toAddress.zip,
    reference: params.toAddress.references,
  });
  const parcel = {
    weight: params.packageWeightKg ?? 1,
    height: 10,
    width: 20,
    length: 30,
  };

  const created = await skydropxFetch("/quotations", {
    method: "POST",
    body: JSON.stringify({
      quotation: {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
      },
    }),
  });

  let quotation = created;
  for (let attempt = 0; attempt < 5 && !quotation.is_completed; attempt++) {
    await sleep(1200);
    quotation = await skydropxFetch(`/quotations/${created.id}`, { method: "GET" });
  }

  const rate = (quotation.rates ?? [])
    .filter((r: { status: string }) => READY_RATE_STATUSES.has(r.status))
    .sort((a: { total: string }, b: { total: string }) => Number(a.total) - Number(b.total))[0];

  if (!rate) {
    throw new Error(
      `Sin tarifas disponibles para esta dirección (cotización ${created.id}, is_completed=${quotation.is_completed})`,
    );
  }

  const shipment = await skydropxFetch("/shipments", {
    method: "POST",
    body: JSON.stringify({
      shipment: { quotation_id: created.id, rate_id: rate.id },
    }),
  });

  const trackingNumber =
    shipment.master_tracking_number ?? shipment.tracking_number ?? shipment.data?.tracking_number;
  if (!trackingNumber) {
    throw new Error(shipment.error_message_detail ?? "Skydropx no devolvió número de guía");
  }

  return {
    carrier: rate.provider_display_name ?? rate.provider_name ?? "Skydropx",
    trackingNumber,
    trackingUrl: shipment.tracking_url ?? null,
    labelUrl: shipment.label_url ?? null,
    cost: Number(rate.total ?? 0),
  };
}

export function skydropxConfigured() {
  return isConfigured();
}
