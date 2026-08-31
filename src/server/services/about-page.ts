import { prisma } from "@/lib/prisma";

export async function getAboutPageContent() {
  return prisma.aboutPageContent.findUnique({ where: { id: "default" } });
}

export type AboutPageImages = {
  styleImageUrl?: string | null;
  shippingImageUrl?: string | null;
  supportImageUrl?: string | null;
  inventoryImageUrl?: string | null;
};

export async function saveAboutPageContent(images: AboutPageImages) {
  await prisma.aboutPageContent.upsert({
    where: { id: "default" },
    create: { id: "default", ...images },
    update: images,
  });
}
