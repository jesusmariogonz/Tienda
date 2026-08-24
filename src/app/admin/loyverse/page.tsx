import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loyverseConfigured } from "@/lib/loyverse";
import { appUrl } from "@/lib/config";

export default async function AdminLoyversePage() {
  const configured = loyverseConfigured();
  const [totalActive, mapped] = await Promise.all([
    prisma.productVariant.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true, loyverseVariantId: { not: null } } }),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Loyverse</h1>
      <p className="text-sm text-zinc-600">
        Loyverse queda como el punto de venta físico (funciona sin internet en tu
        tablet/PC). Esta integración mantiene el inventario de la tienda en línea
        alineado con lo que vendes en persona.
      </p>

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">Estado de la conexión</h2>
        {configured ? (
          <p className="text-sm text-green-700">
            Conectado — {mapped} de {totalActive} variantes activas están
            emparejadas con Loyverse.
          </p>
        ) : (
          <p className="text-sm text-amber-700">
            Faltan las variables de entorno LOYVERSE_API_TOKEN y
            LOYVERSE_STORE_ID.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">1. Configurar credenciales</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-600">
          <li>
            En Loyverse Back Office: Settings → Access Tokens → crea un token y
            ponlo en <code className="rounded bg-zinc-100 px-1">LOYVERSE_API_TOKEN</code>.
          </li>
          <li>
            En Settings → Stores, copia el ID de tu tienda física y ponlo en{" "}
            <code className="rounded bg-zinc-100 px-1">LOYVERSE_STORE_ID</code>.
          </li>
          <li>Agrega ambas variables en Vercel y vuelve a desplegar.</li>
        </ol>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">
          2. Vincular productos (una vez, y cada vez que agregues productos)
        </h2>
        <p className="mb-3 text-sm text-zinc-600">
          No hace falta escribir nada en Loyverse — aquí eliges qué producto
          de Loyverse corresponde a cuál de esta tienda, y el sistema lo
          recuerda. Cuando el nombre coincide, ya viene sugerido.
        </p>
        <Link
          href="/admin/loyverse/mapear"
          className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Vincular productos con Loyverse
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-2 text-sm font-semibold">
          3. Webhook — Loyverse avisa cuando vendes algo en persona
        </h2>
        <p className="text-sm text-zinc-600">
          En Loyverse Back Office: Settings → Webhooks → agrega uno con evento{" "}
          <code className="rounded bg-zinc-100 px-1">inventory_levels.update</code>{" "}
          apuntando a:
        </p>
        <code className="mt-2 block break-all rounded bg-zinc-100 px-2 py-1 text-xs">
          {appUrl}/api/webhooks/loyverse
        </code>
        <p className="mt-2 text-sm text-zinc-600">
          Con esto, cada venta en Loyverse actualiza el stock que ve la tienda en
          línea. En sentido contrario, cada venta pagada en línea también le avisa
          a Loyverse para que no se venda dos veces lo mismo.
        </p>
      </div>
    </div>
  );
}
