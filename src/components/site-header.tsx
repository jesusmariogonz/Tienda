"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { appName } from "@/lib/config";

export function SiteHeader() {
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
      <Link href="/" className="text-lg font-bold tracking-tight uppercase">
        {appName}
      </Link>
      <Link href="/carrito" className="relative text-sm font-medium">
        Carrito
        {mounted && count > 0 && (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-xs text-white">
            {count}
          </span>
        )}
      </Link>
    </header>
  );
}
