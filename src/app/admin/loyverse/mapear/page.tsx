import Link from "next/link";
import { getLoyverseMappingCandidates } from "@/server/services/loyverse";
import { loyverseConfigured } from "@/lib/loyverse";
import { LoyverseMappingClient } from "@/components/loyverse-mapping-client";

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

  const { products, loyverseItems } = await getLoyverseMappingCandidates();

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
    </div>
  );
}
