import Link from "next/link";
import { getOrderById } from "@/server/services/orders";
import { formatPrice } from "@/lib/money";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const order = orderId ? await getOrderById(orderId) : null;

  return (
    <main className="flex-1 px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">¡Gracias por tu compra!</h1>
      {order ? (
        <div className="mt-4 text-sm text-zinc-600">
          <p>Orden {order.orderNumber}</p>
          <p>Total: {formatPrice(Number(order.total))}</p>
          <p className="mt-2">
            Estado:{" "}
            {order.status === "PAID" ? "Pagada" : "Procesando pago…"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          Tu pago se está procesando.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
      >
        Seguir comprando
      </Link>
    </main>
  );
}
