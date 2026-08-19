import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "@/server/services/seed";

// Temporary, token-protected endpoint used once to seed a fresh production
// database by opening a URL (?token=...) in a browser, for setups where
// there's no direct network path to run the seed script otherwise.
// Remove this route once the initial seed has run.
async function handle(req: NextRequest) {
  const token =
    req.headers.get("x-seed-token") ?? req.nextUrl.searchParams.get("token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await runSeed();
  return NextResponse.json({ ok: true });
}

export const GET = handle;
export const POST = handle;
