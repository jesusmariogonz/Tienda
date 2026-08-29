import { appName } from "@/lib/config";

export default function SobreNosotrosPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight uppercase">
        Sobre {appName}
      </h1>
      <p className="text-sm leading-6 text-zinc-600">
        Somos una marca de ropa deportiva y streetwear hecha para moverte
        contigo, dentro y fuera del gimnasio. Diseñamos cada prenda pensando
        en comodidad, durabilidad y un estilo que no pasa de moda.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-200 p-5">
        <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">
          Tienda física
        </h2>
        <p className="text-sm leading-6 text-zinc-600">
          También puedes visitarnos y comprar en mostrador — mismo catálogo,
          mismo inventario. Escríbenos por WhatsApp para conocer horarios y
          ubicación.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-900 uppercase">
          Nuestra ubicación
        </h2>
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400">
          Mapa pendiente — falta la dirección o el enlace de Google Maps del
          local.
        </div>
      </div>
    </main>
  );
}
