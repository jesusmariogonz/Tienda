import { listDiscountedProducts } from "@/server/services/catalog";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function DescuentosPage() {
  const products = await listDiscountedProducts();

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Descuentos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Piezas seleccionadas con precio especial esta semana.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">
          No hay productos en descuento por ahora — vuelve pronto.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
