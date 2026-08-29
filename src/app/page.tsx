import Link from "next/link";
import { listActiveProducts } from "@/server/services/catalog";
import { appName } from "@/lib/config";
import { CatalogFilters } from "@/components/catalog-filters";
import { ProductCard } from "@/components/product-card";

// Render on every request rather than at build time: the catalog changes
// from the admin panel, and build-time prerendering would also make the
// build fail whenever it runs before the database has been migrated.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort =
    params.sort === "precio-asc" || params.sort === "precio-desc"
      ? params.sort
      : "recientes";

  const products = await listActiveProducts({
    category: params.category,
    q: params.q,
    sort,
  });

  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-start justify-center gap-4 bg-black px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="max-w-2xl text-4xl leading-[0.95] font-extrabold tracking-tighter text-white uppercase italic sm:text-6xl">
          Mismo estilo,
          <br />
          diferente precio
        </h1>
        <p className="max-w-md text-sm text-zinc-400 sm:text-base">
          Dupes de ropa deportiva y streetwear, hechos para moverse contigo.
        </p>
        <Link
          href="#catalogo"
          className="mt-2 rounded-full bg-white px-6 py-3 text-sm font-bold tracking-wide text-black uppercase"
        >
          Ver colección
        </Link>
      </section>

      <div id="catalogo">
        <CatalogFilters />
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6">
        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No encontramos productos con esos filtros.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} peek={i === 0} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 px-4 py-8 text-center text-xs text-zinc-400 sm:px-6">
        {appName} — todos los derechos reservados
      </footer>
    </div>
  );
}
