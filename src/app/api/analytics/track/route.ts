import { NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@/server/services/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });

  await recordPageView(path).catch((err) => console.error("[analytics] failed to record:", err));
  return NextResponse.json({ ok: true });
}
