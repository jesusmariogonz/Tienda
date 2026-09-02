import { getWholesaleSettings } from "@/server/services/wholesale-settings";
import { saveWholesaleSettingsAction } from "./actions";

export default async function AdminMayoreoPage() {
  const settings = await getWholesaleSettings();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Mayoreo</h1>
        <p className="mt-1 text-xs text-zinc-500">
          El descuento se activa por el total de piezas en el carrito — no
          importa el modelo, color o talla. En cuanto el cliente llega al
          mínimo, ve una barra de progreso y el descuento se aplica solo,
          automáticamente, a todo el carrito.
        </p>
      </div>

      <form action={saveWholesaleSettingsAction} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Piezas mínimas para activar el mayoreo
          </label>
          <input
            type="number"
            name="minQty"
            min={1}
            required
            defaultValue={settings.minQty}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Descuento (%)</label>
          <input
            type="number"
            name="discountPercent"
            min={1}
            max={90}
            step="0.1"
            required
            defaultValue={settings.discountPercent}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
