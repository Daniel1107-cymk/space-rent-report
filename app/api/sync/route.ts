import { NextResponse } from "next/server";
import { syncAllProperties } from "@/lib/sync";
import { notifyBookingChanges } from "@/lib/telegram-notify";
import { sendTelegram } from "@/lib/telegram";
import { buildDigest } from "@/lib/telegram-queries";
import { formatDigest } from "@/lib/telegram-messages";

// Hit daily by Vercel Cron (vercel.json); Vercel sends Authorization: Bearer CRON_SECRET.
// After syncing it pushes Telegram alerts (new/cancelled bookings) and the morning digest.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllProperties();
  await notifyBookingChanges(result);
  if (result.errors.length > 0) {
    await sendTelegram(`⚠️ <b>Sinkronisasi iCal bermasalah</b>\n${result.errors.length} feed gagal.`);
  }
  await sendTelegram(formatDigest(await buildDigest()));
  return NextResponse.json({
    inserted: result.inserted,
    cancelled: result.cancelled.length,
    errors: result.errors,
  });
}
