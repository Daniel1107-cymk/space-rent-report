// Minimal iCal parsing for Airbnb/Agoda calendar export feeds. Pure functions
// only (vitest has no path-alias config; db-touching sync lives in lib/sync.ts).
// ponytail: regex parser tuned to these two machine-generated feeds; swap in
// an ical lib only if a real feed defeats it.

export type IcalEvent = {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  summary: string;
  description: string;
};

/** "20260704" or "20260704T140000Z" -> "2026-07-04" */
function icalDate(raw: string): string {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

export function parseIcal(text: string): IcalEvent[] {
  // Unfold: RFC 5545 folds long lines with CRLF + single space/tab
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events: IcalEvent[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const prop = (name: string) => {
      const m = body.match(new RegExp(`^${name}[^:]*:(.*)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const start = icalDate(prop("DTSTART"));
    const end = icalDate(prop("DTEND"));
    if (!start || !end) continue;
    events.push({
      uid: prop("UID"),
      start,
      end,
      summary: prop("SUMMARY"),
      description: prop("DESCRIPTION").replace(/\\n/g, "\n"),
    });
  }
  return events;
}

const BLOCKED = /not available|blocked|closed|unavailable/i;

/** Map one feed's events to insertable booking rows. */
export function eventsToBookings(
  events: IcalEvent[],
  source: "airbnb" | "agoda",
  propertyId: number
) {
  const rows = [];
  for (const ev of events) {
    if (BLOCKED.test(ev.summary)) continue;
    const nights = Math.round((Date.parse(ev.end) - Date.parse(ev.start)) / 86_400_000);
    if (nights <= 0) continue;
    // Airbnb: HM… confirmation code in the reservation URL matches CSV imports,
    // so the (source, externalId) unique index dedupes across both paths.
    const code = ev.description.match(/\/details\/(\w+)/)?.[1];
    const externalId = code ?? ev.uid;
    if (!externalId) continue;
    rows.push({
      propertyId,
      source,
      externalId,
      guestName: /^(reserved|booked)$/i.test(ev.summary) ? "" : ev.summary,
      checkIn: ev.start,
      checkOut: ev.end,
      nights,
      payoutIdr: 0, // iCal carries no amounts; admin fills in later
    });
  }
  return rows;
}
