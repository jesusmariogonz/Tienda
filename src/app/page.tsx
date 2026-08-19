import Image from "next/image";
import Link from "next/link";
import { listActiveProducts } from "@/server/services/catalog";
import { appName, currency } from "@/lib/config";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(amount);
}

export default async function Home() {
  const products = await listActiveProducts();

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-zinc-200 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight uppercase">
          {appName}
        </h1>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const image = product.images[0];
            const price = Number(product.basePrice);
            return (
              <Link
                key={product.id}
                href={`/productos/${product.slug}`}
                className="group flex flex-col"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.alt ?? product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                      unoptimized
                    />
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-sm text-zinc-500">
                    {formatPrice(price)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
