import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ownerBalances } from "@/lib/balance";
import { formatIDR } from "@/lib/format";
import { sendTelegram } from "@/lib/telegram";
import { buildDigest, cleaningStatus, upcomingCheckIns } from "@/lib/telegram-queries";
import {
  HELP_TEXT,
  escapeHtml,
  formatCleaning,
  formatDigest,
  formatUpcoming,
} from "@/lib/telegram-messages";

type Update = { message?: { text?: string; chat?: { id?: number } } };

async function balanceText(): Promise<string> {
  const [balances, owners] = await Promise.all([
    ownerBalances(),
    db.select().from(users).where(eq(users.role, "owner")),
  ]);
  if (owners.length === 0) return "Belum ada pemilik.";
  const rows = owners.map((o) => {
    const b = balances.get(o.id) ?? { earned: 0, sent: 0 };
    return `• <b>${escapeHtml(o.name)}</b>: ${formatIDR(b.earned - b.sent)}`;
  });
  return `💰 <b>Saldo ditahan</b>\n${rows.join("\n")}`;
}

// Telegram calls this for every message to the bot. Registered with setWebhook + secret_token.
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as Update | null;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;
  // Only the admin chat may use the bot; stay silent for everyone else.
  if (!text || String(chatId) !== process.env.TELEGRAM_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  // "/today@MyBot arg" -> "/today"
  const command = text.trim().split(/[\s@]/)[0].toLowerCase();
  switch (command) {
    case "/today":
      await sendTelegram(formatDigest(await buildDigest()));
      break;
    case "/week":
      await sendTelegram(formatUpcoming(await upcomingCheckIns()));
      break;
    case "/cleaning":
      await sendTelegram(formatCleaning(await cleaningStatus()));
      break;
    case "/balance":
      await sendTelegram(await balanceText());
      break;
    case "/start":
    case "/help":
      await sendTelegram(HELP_TEXT);
      break;
    default:
      await sendTelegram("Perintah tidak dikenal.\n\n" + HELP_TEXT);
  }
  return NextResponse.json({ ok: true });
}
