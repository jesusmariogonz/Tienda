// Skydropx Pro API client. No-ops (returns null) when the OAuth2 client
// credentials aren't set, same pattern as Resend — lets the rest of the app
// call this safely before the client has real credentials configured.
//
// Confirmed against Skydropx's own docs + their live test console (Aug
// 2026): host is pro.skydropx.com. Real flow is 3 steps, per their own
// "Guía para crear envío":
//   1. POST /api/v1/quotations       → create a quotation
//   2. GET  /api/v1/quotations/:id   → poll until is_completed, pick a rate
//   3. POST /api/v1/shipments        → { quotation_id, rate_id, ... } → label
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

export type SkydropxRate = {
  id: string;
  providerName: string;
  providerDisplayName: string;
  serviceName: string;
  total: number;
  currency: string;
  days: number;
  pickup: boolean;
  pickupAutomatic: boolean;
  officeDelivery: boolean;
};

export type SkydropxQuote = {
  quotationId: string;
  rates: SkydropxRate[];
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
    // Skydropx caps name/company at 30 chars and rejects the whole
    // shipment otherwise — real customer names (two names + two surnames
    // is common in Mexico) routinely run longer than that.
    name: a.name.slice(0, 30),
    company: a.company.slice(0, 30),
    phone: a.phone,
    email: a.email,
    street1: a.street ?? "",
    area_level2: a.city ?? "",
    area_level1: a.state ?? "",
    area_level3: a.city ?? "",
    postal_code: a.zip ?? "",
    country_code: "MX",
    reference: (a.reference || "N/A").slice(0, 30),
  };
}

function buildParcel(weightKg?: number) {
  return {
    weight: weightKg ?? 1,
    height: 10,
    width: 20,
    length: 30,
    package_type: process.env.SKYDROPX_PACKAGE_TYPE ?? "4G",
    consignment_note: process.env.SKYDROPX_CONSIGNMENT_NOTE ?? "53101602",
  };
}

const READY_RATE_STATUSES = new Set(["approved", "price_found_internal", "price_found_external"]);

// Only these carriers are offered/booked — the store owner only wants to
// deal with the ones they actually trust/have a relationship with, even
// though Skydropx quotes many more.
const ALLOWED_CARRIERS = ["estafeta", "fedex", "dhl"];

function isAllowedCarrier(providerName: string) {
  const normalized = providerName.toLowerCase();
  return ALLOWED_CARRIERS.some((carrier) => normalized.includes(carrier));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RawRate = {
  id: string;
  status: string;
  provider_name: string;
  provider_display_name: string;
  provider_service_name: string;
  total: string;
  currency_code: string;
  days: number;
  pickup: boolean;
  pickup_automatic: boolean;
  office_delivery: boolean;
};

function mapRates(rawRates: RawRate[]): SkydropxRate[] {
  return rawRates
    .filter((r) => READY_RATE_STATUSES.has(r.status) && isAllowedCarrier(r.provider_name))
    .map((r) => ({
      id: r.id,
      providerName: r.provider_name,
      providerDisplayName: r.provider_display_name,
      serviceName: r.provider_service_name,
      total: Number(r.total),
      currency: r.currency_code,
      days: r.days,
      pickup: r.pickup,
      pickupAutomatic: r.pickup_automatic,
      officeDelivery: r.office_delivery,
    }))
    .sort((a, b) => a.total - b.total);
}

/** Step 1+2: creates a quotation and polls it until Skydropx finishes
 * pricing every carrier, returning the usable rates for the admin to pick
 * from. Returns null if Skydropx isn't configured. */
export async function quoteSkydropxShipment(params: {
  origin: OriginAddress;
  toAddress: ShippingAddress;
  packageWeightKg?: number;
}): Promise<SkydropxQuote | null> {
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
    name: "Cliente",
    company: "N/A",
    phone: "0000000000",
    email: "cliente@example.com",
    street: params.toAddress.street,
    city: params.toAddress.city,
    state: params.toAddress.state,
    zip: params.toAddress.zip,
    reference: params.toAddress.references,
  });

  const created = await skydropxFetch("/quotations", {
    method: "POST",
    body: JSON.stringify({
      quotation: {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [buildParcel(params.packageWeightKg)],
      },
    }),
  });

  let quotation = created;
  for (let attempt = 0; attempt < 5 && !quotation.is_completed; attempt++) {
    await sleep(1200);
    quotation = await skydropxFetch(`/quotations/${created.id}`, { method: "GET" });
  }

  return { quotationId: quotation.id, rates: mapRates(quotation.rates ?? []) };
}

/** Re-fetches a previously created quotation, so a rate the customer picked
 * at checkout can be verified server-side (authoritative price) before it's
 * charged — never trust a cost the client sends for it. Returns null if
 * Skydropx isn't configured or the quotation can't be found. */
export async function getSkydropxQuotation(quotationId: string): Promise<SkydropxQuote | null> {
  if (!isConfigured()) return null;
  try {
    const quotation = await skydropxFetch(`/quotations/${quotationId}`, { method: "GET" });
    return { quotationId: quotation.id, rates: mapRates(quotation.rates ?? []) };
  } catch {
    return null;
  }
}

/** Step 3: books a previously quoted rate into an actual shipment/label. */
export async function bookSkydropxShipment(params: {
  quotationId: string;
  rateId: string;
  origin: OriginAddress;
  toAddress: ShippingAddress;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  packageWeightKg?: number;
  requestPickup: boolean;
}): Promise<SkydropxLabelResult> {
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
  const parcel = buildParcel(params.packageWeightKg);

  const shipment = await skydropxFetch("/shipments", {
    method: "POST",
    body: JSON.stringify({
      shipment: {
        quotation_id: params.quotationId,
        rate_id: params.rateId,
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
        consignment_note: parcel.consignment_note,
        package_type: parcel.package_type,
        pickup: params.requestPickup,
      },
    }),
  });

  // Logged unconditionally (not just on failure) so the very next attempt —
  // success or not — leaves a record of Skydropx's actual response shape in
  // Vercel's Runtime Logs. The exact field names below are a best guess
  // across the flat/JSON:API-ish shapes Skydropx has used in other
  // endpoints; this sandbox can't reach their docs to confirm live.
  console.log("[skydropx] /shipments response:", JSON.stringify(shipment));

  const attrs = shipment.data?.attributes ?? shipment.data ?? shipment;
  const trackingNumber =
    attrs.master_tracking_number ??
    attrs.tracking_number ??
    shipment.master_tracking_number ??
    shipment.tracking_number;

  if (!trackingNumber) {
    const detail =
      shipment.error_message_detail ??
      shipment.errors?.[0]?.detail ??
      (shipment.errors ? JSON.stringify(shipment.errors) : undefined);
    throw new Error(
      detail
        ? `Skydropx no devolvió número de guía: ${detail}`
        : "Skydropx no devolvió número de guía — revisa los logs de Vercel para ver la respuesta completa",
    );
  }

  return {
    carrier: attrs.rate?.provider_display_name ?? shipment.rate?.provider_display_name ?? "Skydropx",
    trackingNumber,
    trackingUrl: attrs.tracking_url ?? shipment.tracking_url ?? null,
    labelUrl: attrs.label_url ?? shipment.label_url ?? null,
    cost: Number(attrs.rate?.total ?? shipment.rate?.total ?? 0),
  };
}

export function skydropxConfigured() {
  return isConfigured();
}

/** Reads the account's available credit balance (GET /finance/credits).
 * Returns null if Skydropx isn't configured. */
export async function getSkydropxBalance(): Promise<{ amount: number; currency: string } | null> {
  if (!isConfigured()) return null;

  const res = await skydropxFetch("/finance/credits", { method: "GET" });
  const entry = Array.isArray(res.data) ? res.data[0] : res.data ?? res;
  const amount = Number(
    entry?.balance ?? entry?.amount ?? entry?.available_credit ?? entry?.credits ?? 0,
  );
  const currency = entry?.currency_code ?? entry?.currency ?? "MXN";
  return { amount, currency };
}
