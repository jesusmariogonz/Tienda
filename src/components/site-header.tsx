"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { appName } from "@/lib/config";
import { MegaMenu } from "./mega-menu";

export function SiteHeader({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-black px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MegaMenu categories={categories} />
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo-dupefit.jpg"
            alt={appName}
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
          <span className="hidden text-xl font-extrabold tracking-tighter text-white uppercase italic sm:inline">
            {appName}
          </span>
        </Link>
      </div>
      <Link
        href="/carrito"
        className="relative text-sm font-semibold tracking-wide text-white uppercase"
      >
        Carrito
        {mounted && count > 0 && (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-black">
            {count}
          </span>
        )}
      </Link>
    </header>
  );
}
