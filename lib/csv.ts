// Parsers for Airbnb and Agoda export CSVs. Runs in the browser (import preview)
// and in vitest. Header-alias based: tolerant to the column-name drift both
// platforms are known for.
// ponytail: header-based detection + aliases; add a manual column mapper only if a real file defeats this.

export type ParsedRow = {
  source: "airbnb" | "agoda";
  externalId: string;
  guestName: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  payoutIdr: number;
  /** listing/property name as written in the CSV, for mapping to a property */
  listing: string;
};

const AIRBNB = {
  confirmation: ["confirmation code"],
  startDate: ["start date", "arrives", "arriving"],
  endDate: ["end date"],
  nights: ["nights", "# of nights"],
  guest: ["guest", "guest name"],
  listing: ["listing"],
  amount: ["amount", "earnings", "paid out", "gross earnings"],
  type: ["type"],
  status: ["status"],
};

const AGODA = {
  bookingId: ["booking id", "bookingid", "booking number"],
  checkIn: ["check-in", "check in", "checkin", "checkindate", "staydatefrom", "arrival"],
  checkOut: ["check-out", "check out", "checkout", "checkoutdate", "staydateto", "departure"],
  guest: ["guest name", "guestname", "customer name", "guest"],
  amount: [
    "net to hotel",
    "nettohotel",
    "reference sell inclusive",
    "sell inclusive",
    "total payout",
    "payout",
    "amount",
  ],
  listing: ["property name", "propertyname", "hotel name", "listing"],
};

function findKey(row: Record<string, string>, aliases: string[]): string | null {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const hit = keys.find((k) => k.trim().toLowerCase() === alias);
    if (hit) return hit;
  }
  return null;
}

function get(row: Record<string, string>, aliases: string[]): string {
  const key = findKey(row, aliases);
  return key ? (row[key] ?? "").trim() : "";
}

export function detectFormat(headers: string[]): "airbnb" | "agoda" | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const has = (aliases: string[]) => aliases.some((a) => lower.includes(a));
  if (has(AIRBNB.confirmation) && has(AIRBNB.listing)) return "airbnb";
  if (has(AGODA.bookingId) && has(AGODA.checkIn)) return "agoda";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Normalize the date formats both platforms emit to YYYY-MM-DD. Returns "" if unparseable. */
export function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  // 2026-07-04
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // 07/04/2026 (US, Airbnb) — MM/DD/YYYY, optionally with a trailing time (Agoda: "03/07/2026 00:00:00")
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  // 4-Jul-2026 or 04 Jul 2026 (Agoda)
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (month) return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

/** "Rp 1.500.000" / "1,500,000.00" / "1500000" -> 1500000 */
export function parseAmount(raw: string): number {
  const s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  // If both separators appear, the last one is the decimal point.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;
  if (lastDot > -1 && lastComma > -1) {
    normalized =
      lastDot > lastComma
        ? s.replace(/,/g, "")
        : s.replace(/\./g, "").replace(",", ".");
  } else if (lastComma > -1) {
    // comma only: decimal if followed by 1-2 digits, else thousands
    normalized =
      s.length - lastComma - 1 <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot > -1) {
    normalized =
      s.length - lastDot - 1 <= 2 ? s : s.replace(/\./g, "");
  } else {
    normalized = s;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Slash dates only, with an explicit day/month order. Falls back to normalizeDate for other formats. */
function parseSlashDate(raw: string, dayFirst: boolean): string {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (!m) return normalizeDate(raw);
  const [month, day] = dayFirst ? [Number(m[2]), Number(m[1])] : [Number(m[1]), Number(m[2])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Airbnb slash dates are locale-dependent (US exports are MM/DD, Indonesian ones DD/MM).
 * Try both orders and keep the one whose date span matches the nights column.
 */
export function pickDatePair(
  rawStart: string,
  rawEnd: string,
  nights: number
): { checkIn: string; checkOut: string; nights: number } | null {
  for (const requireNightsMatch of [true, false]) {
    for (const dayFirst of [false, true]) {
      const checkIn = parseSlashDate(rawStart, dayFirst);
      if (!checkIn) continue;
      const checkOut = rawEnd
        ? parseSlashDate(rawEnd, dayFirst)
        : nights > 0
          ? addNights(checkIn, nights)
          : "";
      if (!checkOut) continue;
      const span = nightsBetween(checkIn, checkOut);
      if (span <= 0) continue;
      if (requireNightsMatch && nights > 0 && span !== nights) continue;
      return { checkIn, checkOut, nights: span };
    }
  }
  return null;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000
  );
}

function addNights(checkIn: string, nights: number): string {
  const d = new Date(Date.parse(checkIn) + nights * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function parseRows(
  format: "airbnb" | "agoda",
  rows: Record<string, string>[]
): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const row of rows) {
    if (format === "airbnb") {
      // Airbnb payout CSVs mix Reservation and Payout/Adjustment rows; only reservations are bookings.
      const type = get(row, AIRBNB.type);
      if (type && type.toLowerCase() !== "reservation") continue;
      // Reservations CSVs have a Status column; skip cancelled stays.
      if (get(row, AIRBNB.status).toLowerCase().includes("cancel")) continue;
      const nightsCol = parseInt(get(row, AIRBNB.nights), 10) || 0;
      const dates = pickDatePair(
        get(row, AIRBNB.startDate),
        get(row, AIRBNB.endDate),
        nightsCol
      );
      const payoutIdr = parseAmount(get(row, AIRBNB.amount));
      if (!dates || payoutIdr <= 0) continue;
      out.push({
        source: "airbnb",
        externalId: get(row, AIRBNB.confirmation),
        guestName: get(row, AIRBNB.guest),
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        nights: dates.nights,
        payoutIdr,
        listing: get(row, AIRBNB.listing),
      });
    } else {
      const dates = pickDatePair(get(row, AGODA.checkIn), get(row, AGODA.checkOut), 0);
      if (!dates) continue;
      // Agoda's booking report has no amount column; payout stays 0 and is
      // filled in on the import preview (or later on the Bookings page).
      const payoutIdr = parseAmount(get(row, AGODA.amount));
      out.push({
        source: "agoda",
        externalId: get(row, AGODA.bookingId),
        guestName: get(row, AGODA.guest),
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        nights: dates.nights,
        payoutIdr,
        listing: get(row, AGODA.listing),
      });
    }
  }
  return out;
}
