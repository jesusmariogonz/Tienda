import Link from "next/link";
import { auth, signOut } from "@/auth";

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/movimientos", label: "Movimientos" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-zinc-200 sm:w-56 sm:border-b-0 sm:border-r">
        <nav className="flex gap-1 overflow-x-auto p-3 sm:flex-col sm:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          className="mt-auto p-3"
        >
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-600"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>
      <div className="flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}
