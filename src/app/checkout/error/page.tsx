import Link from "next/link";

export default function CheckoutErrorPage() {
  return (
    <main className="flex-1 px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">El pago no se completó</h1>
      <p className="mt-4 text-sm text-zinc-500">
        Tu orden no fue cobrada. Puedes intentar de nuevo desde tu carrito.
      </p>
      <Link
        href="/carrito"
        className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
      >
        Volver al carrito
      </Link>
    </main>
  );
}
