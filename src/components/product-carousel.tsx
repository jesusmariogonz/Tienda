"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ProductCarouselProps = {
  images: { url: string; alt?: string | null }[];
  alt: string;
  /** Extra image shown only on desktop hover — swapped in on mouseenter,
   * never part of the swipeable set. */
  hoverImageUrl?: string | null;
  /** Small slide-and-back hint on mount so mobile users know they can
   * swipe — only when there's more than one image. */
  peek?: boolean;
  /** Prev/next arrow buttons (desktop-oriented, still tappable on touch). */
  arrows?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

export function ProductCarousel({
  images,
  alt,
  hoverImageUrl,
  peek = false,
  arrows = false,
  sizes = "(max-width: 640px) 50vw, 25vw",
  className,
  priority,
}: ProductCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const dragOffset = useRef(0);
  const justSwiped = useRef(false);

  useEffect(() => {
    if (!peek || images.length <= 1) return;
    const timeout = setTimeout(() => {
      setPeeking(true);
      setTimeout(() => setPeeking(false), 550);
    }, 400);
    return () => clearTimeout(timeout);
  }, [peek, images.length]);

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(images.length - 1, i)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    dragOffset.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (Math.abs(dragOffset.current) > 40) {
      goTo(index + (dragOffset.current < 0 ? 1 : -1));
      justSwiped.current = true;
    }
    touchStartX.current = null;
    dragOffset.current = 0;
  }

  // Prevents a swipe gesture from also being read as a tap that navigates
  // into the product (the card sits inside a <Link>).
  function handleClickCapture(e: React.MouseEvent) {
    if (justSwiped.current) {
      e.preventDefault();
      e.stopPropagation();
      justSwiped.current = false;
    }
  }

  if (images.length === 0) {
    return <div className={`bg-zinc-100 ${className ?? ""}`} />;
  }

  const showHover = hovering && hoverImageUrl;

  return (
    <div
      className={`group/carousel relative touch-pan-y overflow-hidden ${className ?? ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      {showHover ? (
        <Image
          src={hoverImageUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          quality={90}
        />
      ) : (
        <div
          className={`flex h-full ${peeking ? "transition-transform duration-300 ease-out" : ""}`}
          style={{
            transform: `translateX(calc(${-index * 100}% + ${peeking ? -14 : 0}px))`,
            transition: peeking ? undefined : "transform 250ms ease-out",
          }}
        >
          {images.map((img, i) => (
            <div key={img.url + i} className="relative h-full w-full shrink-0">
              <Image
                src={img.url}
                alt={img.alt ?? alt}
                fill
                className="object-cover"
                sizes={sizes}
                quality={90}
                priority={priority && i === 0}
              />
            </div>
          ))}
        </div>
      )}

      {!showHover && images.length > 1 && (
        <>
          {arrows && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={(e) => {
                  e.preventDefault();
                  goTo(index - 1);
                }}
                disabled={index === 0}
                className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow transition-opacity group-hover/carousel:opacity-100 disabled:hidden"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={(e) => {
                  e.preventDefault();
                  goTo(index + 1);
                }}
                disabled={index === images.length - 1}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow transition-opacity group-hover/carousel:opacity-100 disabled:hidden"
              >
                ›
              </button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
