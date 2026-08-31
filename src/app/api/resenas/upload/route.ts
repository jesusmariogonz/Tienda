import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

// Public endpoint (no auth — anyone leaving a review needs to attach a
// photo before an account exists for them) mirroring the admin uploader's
// image processing, but capped smaller since these are customer photos,
// not product catalog assets, and every submission stays unapproved until
// the owner reviews it anyway.
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 85;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 5MB)" }, { status: 400 });
  }

  try {
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(originalBuffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const blob = await put(`resenas/${Date.now()}.webp`, optimized, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[resenas/upload] failed:", err);
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
