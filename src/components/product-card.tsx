import Link from "next/link";
import { formatPrice } from "@/lib/money";
import { ProductCarousel } from "@/components/product-carousel";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  basePrice: unknown;
  hoverImageUrl: string | null;
  discountEnabled: boolean;
  discountPercent: unknown;
  images: { url: string; alt?: string | null }[];
  category: { name: string } | null;
  variants: { inventory: { quantity: number } | null }[];
};

export function ProductCard({ product, peek = false }: { product: ProductCardData; peek?: boolean }) {
  const price = Number(product.basePrice);
  const discountPercent =
    product.discountEnabled && product.discountPercent ? Number(product.discountPercent) : null;
  const discountedPrice = discountPercent ? price * (1 - discountPercent / 100) : null;
  const soldOut = product.variants.every((v) => (v.inventory?.quantity ?? 0) <= 0);

  return (
    <Link href={`/productos/${product.slug}`} className="group flex flex-col">
      <ProductCarousel
        images={product.images}
        alt={product.name}
        hoverImageUrl={product.hoverImageUrl}
        peek={peek}
        className="aspect-[2/3] w-full bg-zinc-100"
        sizes="(max-width: 640px) 50vw, 25vw"
        soldOut={soldOut}
      />
      <div className="mt-2.5 space-y-0.5">
        {product.category && (
          <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
            {product.category.name}
          </p>
        )}
        <p className="text-sm font-bold tracking-tight uppercase">{product.name}</p>
        {discountedPrice !== null ? (
          <p className="text-sm">
            <span className="text-zinc-400 line-through">{formatPrice(price)}</span>{" "}
            <span className="font-semibold text-sky-600">{formatPrice(discountedPrice)}</span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">{formatPrice(price)}</p>
        )}
      </div>
    </Link>
  );
}
