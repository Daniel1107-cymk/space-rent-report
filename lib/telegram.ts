const MAX_LEN = 4000; // Telegram limit is 4096 chars per message

/** Send an HTML message to the admin chat. Never throws; no-ops when not configured. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !text) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.length > MAX_LEN ? text.slice(0, MAX_LEN) + "…" : text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) console.error("Telegram send failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Telegram send error", e);
    return false;
  }
}
