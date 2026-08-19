import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

let client: MercadoPagoConfig | null = null;

function getClient() {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN no está configurado");
  }
  if (!client) {
    client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
  }
  return client;
}

export function getMercadoPagoPreference() {
  return new Preference(getClient());
}

export function getMercadoPagoPayment() {
  return new Payment(getClient());
}
