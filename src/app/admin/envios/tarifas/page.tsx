import Link from "next/link";
import { getShippingSettings } from "@/server/services/shipping";
import { saveShippingSettingsAction } from "../actions";

export default async function AdminTarifasEnvioPage() {
  const settings = await getShippingSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/envios" className="text-xs text-zinc-500 underline">
          ← Volver a Envíos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Tarifas de envío</h1>
        <p className="text-xs text-zinc-500">
          Este costo se calcula automáticamente en el carrito y se suma al
          cobro en el checkout.
        </p>
      </div>

      <form
        action={saveShippingSettingsAction}
        className="flex max-w-sm flex-col gap-3 rounded-lg border border-zinc-200 p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Costo de envío estándar
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="flatRate"
            defaultValue={settings.flatRate}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Envío gratis a partir de (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="freeOverAmount"
            defaultValue={settings.freeOverAmount ?? ""}
            placeholder="Dejar vacío para no ofrecer envío gratis"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
