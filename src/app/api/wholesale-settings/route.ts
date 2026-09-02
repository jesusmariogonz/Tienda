import { NextResponse } from "next/server";
import { getWholesaleSettings } from "@/server/services/wholesale-settings";

export async function GET() {
  const settings = await getWholesaleSettings();
  return NextResponse.json(settings);
}
