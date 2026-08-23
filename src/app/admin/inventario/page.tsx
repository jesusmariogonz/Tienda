import { listInventory } from "@/server/services/inventory";
import { resolveColorHex } from "@/lib/color-names";
import { adjustInventoryAction } from "./actions";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const allVariants = await listInventory();

  const categoryNames = Array.from(
    new Set(allVariants.map((v) => v.product.category?.name ?? "Sin categoría")),
  ).sort((a, b) => a.localeCompare(b, "es"));

  let variants = allVariants;
  if (category) {
    variants = variants.filter(
      (v) => (v.product.category?.name ?? "Sin categoría") === category,
    );
  }
  if (q) {
    const nq = normalize(q);
    variants = variants.filter(
      (v) =>
        normalize(v.product.name).includes(nq) ||
        normalize(v.color).includes(nq) ||
        normalize(v.size).includes(nq),
    );
  }

  const groups = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = v.product.category?.name ?? "Sin categoría";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "es"),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <p className="text-xs text-zinc-500">
        Agrupado por categoría — da clic en una categoría para ver el
        detalle de cada variante.
      </p>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar producto, color o talla…"
          className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          Filtrar
        </button>
        {(q || category) && (
          <a
            href="/admin/inventario"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-500"
          >
            Limpiar
          </a>
        )}
      </form>

      <div className="flex flex-col gap-3">
        {sortedGroups.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            No encontramos variantes con esos filtros.
          </p>
        )}
        {sortedGroups.map(([categoryName, items]) => {
          const lowCount = items.filter(
            (v) => v.inventory && v.inventory.quantity <= v.inventory.lowStockThreshold,
          ).length;
          const totalUnits = items.reduce((sum, v) => sum + (v.inventory?.quantity ?? 0), 0);

          return (
            <details
              key={categoryName}
              open={Boolean(q || category)}
              className="overflow-hidden rounded-lg border border-zinc-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between bg-zinc-50 px-4 py-3 text-sm font-medium">
                <span>
                  {categoryName}{" "}
                  <span className="font-normal text-zinc-400">
                    ({items.length} variantes · {totalUnits} unidades)
                  </span>
                </span>
                {lowCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {lowCount} con stock bajo
                  </span>
                )}
              </summary>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2">Variante</th>
                      <th className="px-4 py-2" title="Unidades disponibles ahora mismo">
                        Stock
                      </th>
                      <th
                        className="px-4 py-2"
                        title="A partir de cuántas unidades se envía una alerta por correo"
                      >
                        Alerta de stock bajo en
                      </th>
                      <th className="px-4 py-2">Ajustar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {items.map((v) => {
                      const low =
                        v.inventory && v.inventory.quantity <= v.inventory.lowStockThreshold;
                      return (
                        <tr key={v.id} className={low ? "bg-amber-50" : undefined}>
                          <td className="px-4 py-2 font-medium">{v.product.name}</td>
                          <td className="px-4 py-2 text-zinc-500">
                            <span className="inline-flex items-center gap-1.5">
                              {v.colorHex2 ? (
                                <span className="grid h-3 w-3 grid-cols-2 overflow-hidden rounded-full border border-zinc-300">
                                  <span style={{ backgroundColor: v.colorHex ?? "#ccc" }} />
                                  <span style={{ backgroundColor: v.colorHex2 }} />
                                </span>
                              ) : (
                                resolveColorHex(v.color, v.colorHex) && (
                                  <span
                                    className="inline-block h-3 w-3 rounded-full border border-zinc-300"
                                    style={{
                                      backgroundColor: resolveColorHex(v.color, v.colorHex)!,
                                    }}
                                  />
                                )
                              )}
                              {v.color} / {v.size}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-2 font-medium ${low ? "text-amber-700" : ""}`}
                          >
                            {v.inventory?.quantity ?? 0}
                          </td>
                          <td className="px-4 py-2 text-zinc-500">
                            {v.inventory?.lowStockThreshold ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            <form
                              action={adjustInventoryAction}
                              className="flex items-center gap-1"
                            >
                              <input type="hidden" name="variantId" value={v.id} />
                              <input
                                type="number"
                                name="delta"
                                placeholder="+/-"
                                title="Cantidad a sumar (restock) o restar (ajuste)"
                                required
                                className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <input
                                type="text"
                                name="note"
                                placeholder="Nota"
                                className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <button
                                type="submit"
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
                              >
                                Aplicar
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
