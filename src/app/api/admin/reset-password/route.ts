import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Temporary, token-protected endpoint to sync the admin user's email/password
// with the current ADMIN_EMAIL/ADMIN_PASSWORD env vars, for setups where
// there's no direct network path to the database. Remove after use.
async function handle(req: NextRequest) {
  const token =
    req.headers.get("x-seed-token") ?? req.nextUrl.searchParams.get("token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Faltan ADMIN_EMAIL/ADMIN_PASSWORD" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst();

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { email, passwordHash },
    });
  } else {
    await prisma.user.create({
      data: { email, passwordHash, name: "Admin", role: "ADMIN" },
    });
  }

  return NextResponse.json({ ok: true, email });
}

export const GET = handle;
export const POST = handle;
