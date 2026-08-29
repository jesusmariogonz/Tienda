"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function MegaMenu({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>("categorias");
  const rootRef = useRef<HTMLDivElement>(null);

  // Touch devices don't fire mouseleave, so tapping the hamburger to open
  // needs an explicit way to close on an outside tap.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    // The trigger + panel share one hoverable box (including the gap
    // between them via `pt-2` instead of a margin) so moving the mouse
    // down from the hamburger icon into the panel never leaves the
    // hoverable area and closes it prematurely.
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 sm:h-12 sm:w-12 sm:gap-2"
      >
        <span className="h-0.5 w-6 bg-white sm:h-[3px] sm:w-8" />
        <span className="h-0.5 w-6 bg-white sm:h-[3px] sm:w-8" />
        <span className="h-0.5 w-6 bg-white sm:h-[3px] sm:w-8" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-40 w-[min(94vw,720px)] pt-2">
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-base shadow-xl">
            <div className="w-36 shrink-0 border-r-2 border-zinc-200 bg-zinc-50 py-2 sm:w-48">
              <MenuItem
                label="Categorías"
                active={hovered === "categorias"}
                onHover={() => setHovered("categorias")}
              />
              <MenuLink
                href="/descuentos"
                label="Descuentos"
                onClick={() => setOpen(false)}
                onHover={() => setHovered(null)}
              />
              <MenuLink
                href="/sobre-nosotros"
                label="Sobre nosotros"
                onClick={() => setOpen(false)}
                onHover={() => setHovered(null)}
              />
            </div>
            <div className="flex-1 p-4">
              {hovered === "categorias" ? (
                categories.length > 0 ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-3 gap-y-1">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/?category=${c.slug}`}
                        onClick={() => setOpen(false)}
                        className="truncate rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 text-sm text-zinc-400">
                    Aún no hay categorías.
                  </p>
                )
              ) : (
                <p className="px-2 text-sm text-zinc-400">
                  Pasa el cursor sobre una opción para ver más.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  active,
  onHover,
}: {
  label: string;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      className={`cursor-default px-4 py-2.5 text-sm font-semibold tracking-wide uppercase ${
        active ? "bg-white text-black" : "text-zinc-600"
      }`}
    >
      {label}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
  onHover,
}: {
  href: string;
  label: string;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={onHover}
      className="block px-4 py-2.5 text-sm font-semibold tracking-wide text-zinc-600 uppercase hover:bg-white hover:text-black"
    >
      {label}
    </Link>
  );
}
