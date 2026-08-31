import Image from "next/image";
import { ReviewsSection } from "@/components/reviews-section";
import { listApprovedReviews } from "@/server/services/reviews";
import { getAboutPageContent } from "@/server/services/about-page";

const DEFINE_CARDS = [
  {
    icon: "💪",
    title: "Estilo sin pretextos",
    text: "La ropa que quieres, accesible para quien realmente entrena y vive activo.",
    imageKey: "styleImageUrl" as const,
  },
  {
    icon: "📦",
    title: "Envíos rápidos y rastreados",
    text: "Tu pedido sale en 24 horas hábiles con número de rastreo en tiempo real.",
    imageKey: "shippingImageUrl" as const,
  },
  {
    icon: "🤝",
    title: "Trato directo",
    text: "Somos personas reales. Cualquier duda la resolvemos por WhatsApp al momento.",
    imageKey: "supportImageUrl" as const,
  },
  {
    icon: "🔄",
    title: "Inventario siempre fresco",
    text: "Drops constantes con modelos nuevos para que siempre encuentres algo que te guste.",
    imageKey: "inventoryImageUrl" as const,
  },
];

export default async function SobreNosotrosPage() {
  const [reviews, content] = await Promise.all([
    listApprovedReviews(),
    getAboutPageContent(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-black px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Sobre nosotros
          </p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
            <span className="text-white">El estilo que quieres.</span>
            <br />
            <span className="text-zinc-500">El precio que mereces.</span>
          </h1>
          <div className="mt-6 h-1 w-10 bg-white" />

          <div className="mt-8 flex flex-col gap-5 text-[15px] leading-7 text-zinc-300">
            <p>
              Dupe Fit nació de una idea simple:{" "}
              <strong className="font-semibold text-white">
                no deberías tener que elegir entre vestirte bien y gastar de
                más.
              </strong>{" "}
              La ropa deportiva de las marcas que todos quieren existe a
              precios que muy pocos pueden pagar. Nosotros cambiamos eso.
            </p>
            <p>
              Somos un negocio{" "}
              <strong className="font-semibold text-white">
                100% mexicano, nacido en Saltillo
              </strong>
              , que lleva ropa deportiva de calidad a quienes saben que el
              estilo no depende de la etiqueta. Cada prenda que manejamos está
              seleccionada con criterio — mismo diseño, misma actitud, una
              fracción del precio.
            </p>
            <p>
              Empezamos vendiendo en mercados locales y hoy llevamos tu pedido
              a cualquier rincón de México. Crecimos rápido porque la idea era
              buena — y porque nuestros clientes lo entendieron antes que
              nadie.
            </p>
          </div>

          <blockquote className="mt-8 border-l-2 border-zinc-600 pl-4 text-lg font-medium text-zinc-200 italic">
            &quot;El lujo no está en la etiqueta. Está en quien lo lleva.&quot;
          </blockquote>

          <p className="mt-8 text-[15px] leading-7 text-zinc-300">
            Hoy contamos con{" "}
            <strong className="font-semibold text-white">
              local propio en Saltillo
            </strong>
            , tienda en línea con envíos a toda la república y una comunidad
            que sigue creciendo. Pero lo más importante sigue siendo lo mismo
            que el primer día: traerte lo que quieres, sin cobrar de más por
            ello.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-zinc-800">
            {[
              { value: "+300", label: "Prendas disponibles" },
              { value: "+200", label: "Clientes satisfechos" },
              { value: "Todo MX", label: "Envíos a toda la república" },
            ].map((stat) => (
              <div key={stat.label} className="bg-zinc-950 px-4 py-6 text-center sm:text-left">
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Lo que nos define
          </p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-lg bg-zinc-800 sm:grid-cols-2">
            {DEFINE_CARDS.map((card) => {
              const imageUrl = content?.[card.imageKey];
              return (
                <div
                  key={card.title}
                  className="relative flex min-h-[180px] flex-col justify-end overflow-hidden bg-zinc-950 p-5"
                >
                  {imageUrl && (
                    <>
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
                    </>
                  )}
                  <div className="relative">
                    <span className="text-xl">{card.icon}</span>
                    <p className="mt-2 text-base font-bold text-white">{card.title}</p>
                    <p className="mt-1 text-sm text-zinc-300">{card.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Nuestra ubicación
            </p>
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950 text-sm text-zinc-500">
              Mapa pendiente — falta la dirección o el enlace de Google Maps
              del local.
            </div>
          </div>
        </div>
      </section>

      <ReviewsSection reviews={reviews} />
    </div>
  );
}
