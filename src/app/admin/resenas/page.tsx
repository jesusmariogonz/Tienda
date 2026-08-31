import Image from "next/image";
import { listPendingReviews, listApprovedReviewsForAdmin } from "@/server/services/reviews";
import { approveReviewAction, rejectReviewAction } from "./actions";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} de 5 estrellas`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default async function AdminResenasPage() {
  const [pending, approved] = await Promise.all([
    listPendingReviews(),
    listApprovedReviewsForAdmin(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Reseñas</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Las reseñas que dejan los clientes en /resenas/nueva quedan
          pendientes hasta que las apruebes aquí — nada se publica sin que
          tú lo veas primero.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Pendientes de aprobar ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay reseñas pendientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((review) => (
              <div
                key={review.id}
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row"
              >
                {review.photoUrl && (
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-zinc-100 sm:h-24 sm:w-24">
                    <Image
                      src={review.photoUrl}
                      alt={review.customerName}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {review.customerName} <Stars rating={review.rating} />
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">{review.text}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {review.createdAt.toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <form action={approveReviewAction.bind(null, review.id)}>
                      <button
                        type="submit"
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Aprobar
                      </button>
                    </form>
                    <form action={rejectReviewAction.bind(null, review.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600"
                      >
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Publicadas ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-zinc-400">Todavía no hay reseñas publicadas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {approved.map((review) => (
              <div
                key={review.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {review.customerName} <Stars rating={review.rating} />
                  </p>
                  <p className="text-xs text-zinc-500">{review.text}</p>
                </div>
                <form action={rejectReviewAction.bind(null, review.id)}>
                  <button type="submit" className="shrink-0 text-xs text-red-600 underline">
                    Quitar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
