import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Text-labeled placeholder (not a real product photo) so it's obvious what
// each item is until the merchant uploads real photos from the admin panel.
const PLACEHOLDER_IMAGE = (label: string) =>
  `https://placehold.co/800x1000/f4f4f5/52525b?text=${encodeURIComponent(label)}`;

const SIZES = ["S", "M", "L", "XL"];

type ProductSeed = {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  category: string;
  colors: string[];
  sizes?: string[];
};

const products: ProductSeed[] = [
  {
    name: "Playera Oversize Básica",
    slug: "playera-oversize-basica",
    description: "Playera oversize de algodón pesado, corte streetwear.",
    basePrice: 449,
    category: "Playeras",
    colors: ["Negro", "Blanco", "Gris"],
  },
  {
    name: "Hoodie Essential",
    slug: "hoodie-essential",
    description: "Hoodie unisex de french terry con bolsillo canguro.",
    basePrice: 899,
    category: "Hoodies",
    colors: ["Negro", "Vino"],
  },
  {
    name: "Shorts Deportivos",
    slug: "shorts-deportivos",
    description: "Shorts deportivos ligeros con malla interior.",
    basePrice: 549,
    category: "Shorts",
    colors: ["Negro", "Gris"],
  },
  {
    name: "Playera Compresión",
    slug: "playera-compresion",
    description: "Playera de compresión de secado rápido para entrenar.",
    basePrice: 499,
    category: "Playeras",
    colors: ["Negro", "Blanco"],
  },
  {
    name: "Pants Jogger",
    slug: "pants-jogger",
    description: "Jogger de algodón con puño ajustable en tobillo.",
    basePrice: 799,
    category: "Pants",
    colors: ["Negro", "Gris", "Beige"],
  },
  {
    name: "Gorra Snapback",
    slug: "gorra-snapback",
    description: "Gorra snapback ajustable, estructura media.",
    basePrice: 349,
    category: "Accesorios",
    colors: ["Negro", "Blanco"],
    sizes: ["Unitalla"],
  },
  {
    name: "Chaleco Deportivo",
    slug: "chaleco-deportivo",
    description: "Chaleco deportivo ligero ideal para entrenamiento.",
    basePrice: 599,
    category: "Chalecos",
    colors: ["Negro", "Gris"],
  },
  {
    name: "Playera Sin Mangas Training",
    slug: "playera-sin-mangas-training",
    description: "Playera sin mangas transpirable para entrenamiento.",
    basePrice: 429,
    category: "Playeras",
    colors: ["Negro", "Blanco", "Azul"],
  },
];

/** Idempotent: creates the admin user and the placeholder catalog if
 * they don't exist yet, safe to run more than once. */
export async function runSeed() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  for (const p of products) {
    const category = await prisma.category.upsert({
      where: { name: p.category },
      update: {},
      create: {
        name: p.category,
        slug: p.category
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/\s+/g, "-"),
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: category.id,
      },
    });

    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });
    if (existingImages === 0) {
      await prisma.productImage.createMany({
        data: [0, 1].map((i) => ({
          productId: product.id,
          url: PLACEHOLDER_IMAGE(p.name),
          alt: p.name,
          position: i,
        })),
      });
    }

    const sizes = p.sizes ?? SIZES.slice(0, 3);
    for (const color of p.colors) {
      for (const size of sizes) {
        const sku = `${p.slug}-${size}-${color}`
          .toUpperCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/\s+/g, "-");

        const variant = await prisma.productVariant.upsert({
          where: {
            productId_size_color: {
              productId: product.id,
              size,
              color,
            },
          },
          update: {},
          create: {
            productId: product.id,
            sku,
            size,
            color,
          },
        });

        await prisma.inventory.upsert({
          where: { variantId: variant.id },
          update: {},
          create: {
            variantId: variant.id,
            quantity: 25,
            lowStockThreshold: 5,
          },
        });
      }
    }
  }
}
