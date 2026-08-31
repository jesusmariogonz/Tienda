import Link from "next/link";
import { getAboutPageContent } from "@/server/services/about-page";
import { AdminImageUploader } from "@/components/admin-image-uploader";
import { saveAboutPageImagesAction } from "./actions";

export default async function AdminSobreNosotrosPage() {
  const content = await getAboutPageContent();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Sobre nosotros — Fotos</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Estas 4 fotos son el fondo de las tarjetas de &quot;Lo que nos
          define&quot; en{" "}
          <Link href="/sobre-nosotros" className="underline" target="_blank">
            /sobre-nosotros
          </Link>
          . Se muestran con un degradado oscuro encima para que el texto se
          lea bien.
        </p>
      </div>

      <form action={saveAboutPageImagesAction} className="flex flex-col gap-6">
        <AdminImageUploader
          label="Estilo sin pretextos"
          fieldName="styleImageUrl"
          multiple={false}
          initialUrls={content?.styleImageUrl ? [content.styleImageUrl] : []}
        />
        <AdminImageUploader
          label="Envíos rápidos y rastreados"
          fieldName="shippingImageUrl"
          multiple={false}
          initialUrls={content?.shippingImageUrl ? [content.shippingImageUrl] : []}
        />
        <AdminImageUploader
          label="Trato directo"
          fieldName="supportImageUrl"
          multiple={false}
          initialUrls={content?.supportImageUrl ? [content.supportImageUrl] : []}
        />
        <AdminImageUploader
          label="Inventario siempre fresco"
          fieldName="inventoryImageUrl"
          multiple={false}
          initialUrls={content?.inventoryImageUrl ? [content.inventoryImageUrl] : []}
        />

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
