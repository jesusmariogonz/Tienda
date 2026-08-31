import Link from "next/link";
import Image from "next/image";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  photoUrl: string | null;
  createdAt: Date;
};

function Stars({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  return (
    <div className={`flex gap-0.5 ${size}`} aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-amber-400" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="border-t border-zinc-200 bg-zinc-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Reseñas de clientes
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-zinc-900">{average.toFixed(1)}</span>
            <Stars rating={Math.round(average)} size="text-lg" />
          </div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              {review.photoUrl && (
                <div className="relative aspect-[4/3] w-full bg-zinc-100">
                  <Image
                    src={review.photoUrl}
                    alt={review.customerName}
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Stars rating={review.rating} />
                <p className="line-clamp-4 text-sm text-zinc-600">{review.text}</p>
                <p className="mt-auto text-xs font-semibold text-zinc-900">
                  {review.customerName}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          ¿Ya nos compraste?{" "}
          <Link href="/resenas/nueva" className="font-medium text-sky-600 underline">
            Déjanos tu reseña
          </Link>
        </p>
      </div>
    </section>
  );
}
