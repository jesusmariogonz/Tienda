import { NextRequest, NextResponse } from "next/server";

// Looks up city/state/colonias for a Mexican postal code via a free public
// API. Best-effort: any failure (network, unexpected shape, rate limit)
// just returns "not found" instead of breaking checkout — the address
// fields stay manually editable either way.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cp: string }> }) {
  const { cp } = await params;
  if (!/^\d{5}$/.test(cp)) {
    return NextResponse.json({ error: "Código postal inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api-sepomex.hckdrk.mx/query/info_cp/${cp}?type=simplified`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const info = data?.response;
    if (!info) throw new Error("sin datos");

    return NextResponse.json({
      city: info.municipio ?? "",
      state: info.estado ?? "",
      colonias: (Array.isArray(info.asentamiento) ? info.asentamiento : [info.asentamiento]).filter(
        Boolean,
      ),
    });
  } catch (err) {
    console.warn("[postal-code] lookup failed:", err);
    return NextResponse.json({ error: "No se pudo consultar el código postal" }, { status: 502 });
  }
}
