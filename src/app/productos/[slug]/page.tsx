import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/services/catalog";
import { ProductVariantPicker } from "@/components/product-variant-picker";
import { ProductCarousel } from "@/components/product-carousel";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.active) notFound();

  const images = product.images;
  const basePrice = Number(product.basePrice);
  const variants = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    colorHex2: v.colorHex2,
    price: v.price ? Number(v.price) : basePrice,
    stock: v.inventory?.quantity ?? 0,
  }));

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2">
        <ProductCarousel
          images={images}
          alt={product.name}
          arrows
          priority
          className="aspect-[4/5] w-full rounded-lg bg-zinc-100"
          sizes="(max-width: 640px) 100vw, 50vw"
        />

        <div className="flex flex-col gap-4">
          <div>
            {product.category && (
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {product.category.name}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
          </div>

          {product.description && (
            <p className="text-sm leading-6 text-zinc-600">
              {product.description}
            </p>
          )}

          <ProductVariantPicker
            productSlug={product.slug}
            productName={product.name}
            image={images[0]?.url}
            basePrice={basePrice}
            variants={variants}
            wholesale={
              product.wholesaleEnabled && product.wholesaleMinQty && product.wholesaleDiscountPercent
                ? {
                    minQty: product.wholesaleMinQty,
                    discountPercent: Number(product.wholesaleDiscountPercent),
                  }
                : null
            }
          />
        </div>
      </div>
    </main>
  );
}
