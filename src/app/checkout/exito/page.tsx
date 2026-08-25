import Link from "next/link";
import Image from "next/image";
import { getOrderById } from "@/server/services/orders";
import { formatPrice } from "@/lib/money";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const order = orderId ? await getOrderById(orderId) : null;

  const orderCode = order ? `#DF-${order.orderSeq.toString().padStart(5, "0")}` : null;

  return (
    <main className="flex-1 px-4 py-16 text-center sm:px-6 lg:py-24">
      <ClearCartOnMount />
      {order ? (
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-green-600 lg:size-20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7 text-green-600 lg:size-10"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      ) : null}
      <h1 className="mt-4 text-xl font-semibold lg:text-3xl">¡Gracias por tu compra!</h1>
      {order ? (
        <div className="mx-auto mt-6 max-w-md text-left text-sm text-zinc-600 lg:max-w-xl lg:text-base">
          <div className="rounded-lg border border-zinc-200 p-4 lg:p-8">
            <p className="font-medium text-zinc-900 lg:text-lg">Número de Orden: {orderCode}</p>
            <p className="mt-1">
              Estado:{" "}
              <span className={order.status === "PAID" ? "text-green-700" : "text-amber-700"}>
                {order.status === "PAID" ? "Pagada" : "Procesando pago…"}
              </span>
            </p>

            <ul className="mt-4 divide-y divide-zinc-100 lg:mt-6">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 lg:gap-4 lg:py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-zinc-100 lg:size-20">
                    {item.variant.product.images[0] ? (
                      <Image
                        src={item.variant.product.images[0].url}
                        alt={item.variant.product.images[0].alt ?? item.variant.product.name}
                        fill
                        sizes="(min-width: 1024px) 80px, 56px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div>
                      <p className="text-zinc-900">{item.variant.product.name}</p>
                      <p className="text-xs text-zinc-500 lg:text-sm">
                        {item.variant.color} / {item.variant.size} · x{item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-zinc-900">
                      {formatPrice(Number(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1 border-t border-zinc-200 pt-3 lg:mt-6 lg:space-y-2 lg:pt-4">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Descuento</span>
                  <span>-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              {Number(order.shippingCost) > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Envío</span>
                  <span>{formatPrice(Number(order.shippingCost))}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-semibold text-zinc-900 lg:text-lg">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {order.shippingAddress ? (
            <div className="mt-4 rounded-lg border border-zinc-200 p-4 lg:p-8">
              <p className="font-medium text-zinc-900 lg:text-lg">Enviar a</p>
              <p className="mt-1 whitespace-pre-line text-zinc-600">
                {order.customerName}
                {"\n"}
                {order.customerEmail}
                {order.customerPhone ? `\n${order.customerPhone}` : ""}
              </p>
            </div>
          ) : null}
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
