import { prisma } from "@/lib/prisma";

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
