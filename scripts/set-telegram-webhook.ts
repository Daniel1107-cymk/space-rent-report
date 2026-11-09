// Usage: npx tsx --env-file=.env.local scripts/set-telegram-webhook.ts https://your-domain.com
export {};
const base = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!base || !token || !secret) {
  console.error("Need base URL arg plus TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in env.");
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${base.replace(/\/$/, "")}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
  }),
});
console.log(await res.json());
