import { NextResponse } from "next/server";
import { syncAllProperties } from "@/lib/sync";

// Hit daily by Vercel Cron (vercel.json); Vercel sends Authorization: Bearer CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllProperties();
  return NextResponse.json(result);
}
