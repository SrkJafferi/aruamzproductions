"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/* Structural, not `typeof featured.images[number]`. The About page ships its
   own three-still gallery whose entries carry none of the homepage set's
   bookkeeping fields, and the viewer only ever reads these four. */
type Item = { src: string; alt: string; width: number; height: number };

/**
 * Fullscreen viewer for the gallery. Keyboard driven (arrows + Escape) and
 * focus-trapped to the two controls it renders.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: readonly Item[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const item = items[index];

  const go = useCallback(
    (delta: number) => onNavigate((index + delta + items.length) % items.length),
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Project image ${index + 1} of ${items.length}`}
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: "rgb(8 8 8 / 0.94)" }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="dock-button absolute top-4 right-4 sm:top-6 sm:right-6"
      >
        <X className="size-4" />
      </button>

      <button
        type="button"
        aria-label="Previous image"
        onClick={(event) => {
          event.stopPropagation();
          go(-1);
        }}
        className="dock-button absolute left-3 sm:left-6"
      >
        <ChevronLeft className="size-4" />
      </button>

      <figure
        className="relative max-h-[86vh] w-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={item.src}
          alt={item.alt}
          width={item.width}
          height={item.height}
          sizes="(max-width: 1024px) 92vw, 1024px"
          className="mx-auto h-auto max-h-[86vh] w-auto object-contain"
          priority
        />
        <figcaption className="mt-4 text-center font-mono text-[0.6875rem] tracking-[0.24em] text-white/45">
          {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </figcaption>
      </figure>

      <button
        type="button"
        aria-label="Next image"
        onClick={(event) => {
          event.stopPropagation();
          go(1);
        }}
        className="dock-button absolute right-3 sm:right-6"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function useLightbox() {
  const [index, setIndex] = useState<number | null>(null);
  return {
    index,
    open: (next: number) => setIndex(next),
    close: () => setIndex(null),
    navigate: (next: number) => setIndex(next),
  };
}
