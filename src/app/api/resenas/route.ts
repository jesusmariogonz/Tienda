import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createReview } from "@/server/services/reviews";

const bodySchema = z.object({
  customerName: z.string().min(1, "Falta tu nombre").max(80),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1, "Escribe tu reseña").max(1000),
  photoUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await createReview(parsed.data);
  return NextResponse.json({ ok: true });
}
