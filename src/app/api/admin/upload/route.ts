import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { auth } from "@/auth";

// Caps the longer side so nobody accidentally uploads a 12MP phone photo
// straight to production — this is on top of (not instead of) Next.js's
// own on-the-fly image optimization for serving.
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 8MB)" }, { status: 400 });
  }

  try {
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(originalBuffer)
      .rotate() // respects EXIF orientation before resizing
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const baseName = file.name.replace(/\.[^.]+$/, "");
    const blob = await put(`productos/${Date.now()}-${baseName}.webp`, optimized, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload] failed:", err);
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
