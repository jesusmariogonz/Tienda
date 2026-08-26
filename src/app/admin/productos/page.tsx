import Link from "next/link";
import { listProductsForAdmin } from "@/server/services/admin-catalog";
import { formatPrice } from "@/lib/money";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ deactivated?: string }>;
}) {
  const { deactivated } = await searchParams;
  const products = await listProductsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      {deactivated && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ese producto ya tiene ventas registradas, así que no se puede
          borrar por completo sin afectar ese historial — lo desactivamos en
          su lugar: ya no se muestra en la tienda ni en el inventario.
        </p>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Nuevo producto
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2">Variantes</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-zinc-500">
                  {p.category?.name ?? "—"}
                </td>
                <td className="px-4 py-2">{formatPrice(Number(p.basePrice))}</td>
                <td className="px-4 py-2 text-zinc-500">
                  {p.variants.filter((v) => v.active).length}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.active
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="text-sm text-zinc-600 underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
