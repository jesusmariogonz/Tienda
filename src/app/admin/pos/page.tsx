import { PosClient } from "./pos-client";

export default function PosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Mostrador (POS)</h1>
      <p className="text-sm text-zinc-500">
        Registra ventas de mostrador. Esto descuenta del mismo inventario que
        la tienda en línea — no procesa ningún cobro.
      </p>
      <PosClient />
    </div>
  );
}
