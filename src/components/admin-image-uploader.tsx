"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export function AdminImageUploader({
  initialUrls = [],
  fieldName = "imageUrl",
  multiple = true,
  label = "Imágenes",
}: {
  initialUrls?: string[];
  fieldName?: string;
  multiple?: boolean;
  label?: string;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          throw new Error(data?.error ?? `Error al subir imagen (${res.status})`);
        }
        uploaded.push(data.url);
      }
      setUrls((prev) => (multiple ? [...prev, ...uploaded] : uploaded));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUrl(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-sm font-medium">{label}</label>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url) => (
            <div key={url} className="relative">
              <input type="hidden" name={fieldName} value={url} />
              <div className="relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </div>
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || (!multiple && urls.length > 0)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : multiple ? "+ Subir imágenes" : "+ Subir imagen"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
