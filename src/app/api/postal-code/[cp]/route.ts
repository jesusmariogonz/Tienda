import { NextRequest, NextResponse } from "next/server";
import { buscaCP } from "@webrek/mx-cp";

// Looks up city/state/colonias for a Mexican postal code from a bundled
// SEPOMEX dataset — no external API call, so no third-party uptime/rate
// limits to worry about. Covers all ~32,467 official postal codes.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cp: string }> }) {
  const { cp } = await params;
  if (!/^\d{5}$/.test(cp)) {
    return NextResponse.json({ error: "Código postal inválido" }, { status: 400 });
  }

  try {
    const info = await buscaCP(cp);
    if (!info) {
      return NextResponse.json({ error: "Código postal no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      city: info.municipio,
      state: info.estado,
      colonias: info.asentamientos.map((a) => a.nombre),
    });
  } catch (err) {
    console.warn("[postal-code] lookup failed:", err);
    return NextResponse.json({ error: "No se pudo consultar el código postal" }, { status: 502 });
  }
}
