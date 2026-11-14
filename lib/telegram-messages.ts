// Pure message formatters for the Telegram bot (HTML parse mode). No db / alias
// imports so vitest can load this file directly.

export type BookingLine = {
  propertyName: string;
  guestName: string | null;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  source?: string;
};

export type DigestInput = {
  today: string;
  checkIns: BookingLine[];
  checkOuts: BookingLine[];
  needsCleaning: { propertyName: string; checkOut: string; daysSince: number }[];
  upcoming: (BookingLine & { daysUntil: number })[];
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m}`;
}

function guest(name: string | null): string {
  return escapeHtml(name?.trim() || "tamu");
}

function dayWord(n: number): string {
  if (n === 0) return "hari ini";
  if (n === 1) return "besok";
  return `${n} hari lagi`;
}

const PLATFORMS: Record<string, string> = { airbnb: "Airbnb", agoda: "Agoda", manual: "Manual" };

/** "Airbnb" / "Agoda" / "Manual", so you know which app to open to message the guest. */
export function platformLabel(source?: string): string {
  if (!source) return "";
  return PLATFORMS[source] ?? escapeHtml(source);
}

function line(b: BookingLine): string {
  const platform = b.source ? ` 📱 <b>${platformLabel(b.source)}</b>` : "";
  return `• <b>${escapeHtml(b.propertyName)}</b> – ${guest(b.guestName)}${platform} (${shortDate(b.checkIn)} → ${shortDate(b.checkOut)}, ${b.nights} malam)`;
}

export function formatNewBooking(b: BookingLine): string {
  return `🆕 <b>Pemesanan baru</b>\n${line(b)}`;
}

export function formatCancellation(b: BookingLine): string {
  return `❌ <b>Pemesanan dibatalkan</b>\n${line(b)}`;
}

export function formatUpcoming(upcoming: (BookingLine & { daysUntil: number })[]): string {
  if (upcoming.length === 0) return "📅 <b>Check-in 7 hari ke depan</b>\nTidak ada.";
  const rows = upcoming.map((b) => `${line(b)} – <i>${dayWord(b.daysUntil)}</i>`);
  return `📅 <b>Check-in 7 hari ke depan</b>\n${rows.join("\n")}`;
}

export function formatCleaning(
  needsCleaning: { propertyName: string; checkOut: string; daysSince: number }[]
): string {
  if (needsCleaning.length === 0) return "🧹 <b>Kebersihan</b>\nSemua unit sudah bersih.";
  const rows = needsCleaning.map(
    (c) => `• <b>${escapeHtml(c.propertyName)}</b> – check-out ${shortDate(c.checkOut)}`
  );
  return `🧹 <b>Perlu dibersihkan</b>\n${rows.join("\n")}`;
}

export function formatDigest(d: DigestInput): string {
  const parts: string[] = [`☀️ <b>Ringkasan ${shortDate(d.today)}</b>`];
  parts.push(
    d.checkIns.length ? `🟢 <b>Check-in hari ini</b>\n${d.checkIns.map(line).join("\n")}` : "🟢 Tidak ada check-in hari ini."
  );
  parts.push(
    d.checkOuts.length ? `🔴 <b>Check-out hari ini</b>\n${d.checkOuts.map(line).join("\n")}` : "🔴 Tidak ada check-out hari ini."
  );
  if (d.needsCleaning.length) parts.push(formatCleaning(d.needsCleaning));
  parts.push(formatUpcoming(d.upcoming));
  return parts.join("\n\n");
}

export const HELP_TEXT = [
  "<b>Perintah</b>",
  "/today – ringkasan hari ini",
  "/week – check-in 7 hari ke depan",
  "/cleaning – unit yang perlu dibersihkan",
  "/balance – saldo ditahan per pemilik",
].join("\n");
