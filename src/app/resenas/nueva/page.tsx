"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function NuevaResenaPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resenas/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir la foto");
      setPhotoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, rating, text, photoUrl: photoUrl ?? undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo enviar tu reseña");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
        <div className="flex size-14 items-center justify-center rounded-full border-2 border-green-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7 text-green-600"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">¡Gracias por tu reseña!</h1>
        <p className="text-sm text-zinc-600">
          La revisamos antes de publicarla — en cuanto la aprobemos, aparecerá
          en la página principal.
        </p>
        <Link href="/" className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white">
          Volver a la tienda
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Déjanos tu reseña</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cuéntanos cómo te fue con tu compra — tu reseña se publica después
          de que la revisemos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Tu nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-zinc-500">Calificación</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${star} estrellas`}
                className="p-0.5 text-3xl leading-none"
              >
                <span className={(hoverRating || rating) >= star ? "text-amber-400" : "text-zinc-300"}>
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Tu reseña</label>
          <textarea
            required
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Cómo te quedó la prenda? ¿Cómo fue el servicio?"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Foto (opcional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
          {photoUrl ? (
            <div className="flex items-center gap-3">
              <div className="relative size-16 overflow-hidden rounded-md bg-zinc-100">
                <Image src={photoUrl} alt="" fill className="object-cover" sizes="64px" />
              </div>
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="text-xs text-red-600 underline"
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-md border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-500 disabled:opacity-50"
            >
              {uploading ? "Subiendo…" : "Agregar una foto"}
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar reseña"}
        </button>
      </form>
    </main>
  );
}
