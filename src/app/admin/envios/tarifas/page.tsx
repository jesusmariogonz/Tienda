import Link from "next/link";
import { getShippingSettings } from "@/server/services/shipping";
import { saveShippingSettingsAction } from "../actions";

export default async function AdminTarifasEnvioPage() {
  const settings = await getShippingSettings();
  const origin = settings.origin;

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

        <div className="mt-2 border-t border-zinc-200 pt-3">
          <p className="text-sm font-medium">Dirección de origen</p>
          <p className="mb-2 text-xs text-zinc-500">
            De dónde sale el paquete — Skydropx la necesita para generar
            guías automáticas.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Empresa</label>
          <input
            type="text"
            name="originCompany"
            defaultValue={origin?.company ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Nombre de contacto
          </label>
          <input
            type="text"
            name="originName"
            defaultValue={origin?.name ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Calle y número</label>
          <input
            type="text"
            name="originStreet"
            defaultValue={origin?.street ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Ciudad</label>
            <input
              type="text"
              name="originCity"
              defaultValue={origin?.city ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Estado</label>
            <input
              type="text"
              name="originState"
              defaultValue={origin?.state ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Código postal</label>
          <input
            type="text"
            name="originZip"
            defaultValue={origin?.zip ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Teléfono</label>
          <input
            type="tel"
            name="originPhone"
            defaultValue={origin?.phone ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Correo</label>
          <input
            type="email"
            name="originEmail"
            defaultValue={origin?.email ?? ""}
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
