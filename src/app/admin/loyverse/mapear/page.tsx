import Link from "next/link";
import { getLoyverseMappingCandidates, listLinkedLoyverseProducts } from "@/server/services/loyverse";
import { loyverseConfigured } from "@/lib/loyverse";
import { LoyverseMappingClient } from "@/components/loyverse-mapping-client";
import { LoyverseLinkedList } from "@/components/loyverse-linked-list";

export default async function LoyverseMappingPage() {
  if (!loyverseConfigured()) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/admin/loyverse" className="text-xs text-zinc-500 underline">
          ← Volver a Loyverse
        </Link>
        <p className="text-sm text-amber-700">
          Loyverse no está configurado todavía (faltan LOYVERSE_API_TOKEN /
          LOYVERSE_STORE_ID).
        </p>
      </div>
    );
  }

  const [{ products, loyverseItems }, linkedProducts] = await Promise.all([
    getLoyverseMappingCandidates(),
    listLinkedLoyverseProducts(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <Link href="/admin/loyverse" className="text-xs text-zinc-500 underline">
          ← Volver a Loyverse
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Vincular productos con Loyverse</h1>
      </div>

      <p className="text-sm text-zinc-600">
        Nada se escribe en Loyverse aquí — solo guardamos de este lado qué
        variante de acá corresponde a cuál de Loyverse. Cuando el nombre del
        producto coincide, ya viene sugerido: solo dale &quot;Vincular&quot;. Si
        alguna variante (color/talla) no se pudo emparejar sola, elígela a mano
        en la lista que aparece debajo de ese producto.
      </p>

      <LoyverseMappingClient products={products} loyverseItems={loyverseItems} />

      <details className="mt-2 rounded-lg border border-zinc-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Ya vinculados ({linkedProducts.reduce((sum, p) => sum + p.variants.length, 0)} variantes)
        </summary>
        <p className="mb-2 mt-2 text-xs text-zinc-500">
          Si vinculaste algo por error, desvincúlalo aquí — vuelve a aparecer
          arriba para emparejarlo de nuevo.
        </p>
        <LoyverseLinkedList products={linkedProducts} />
      </details>
    </div>
  );
}
