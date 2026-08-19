import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "@/server/services/seed";

// Temporary, token-protected endpoint used once to seed a fresh production
// database from an environment (like a sandboxed CI agent) that can reach
// this deployment over HTTPS but not the database directly over TCP.
// Remove this route once the initial seed has run.
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await runSeed();
  return NextResponse.json({ ok: true });
}
