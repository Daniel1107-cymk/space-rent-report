import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { parseIcal, eventsToBookings } from "@/lib/ical";

export type SyncResult = {
  inserted: number;
  errors: string[];
};

/** Fetch every property's iCal feeds and insert new bookings (dedupe via unique index). */
export async function syncAllProperties(): Promise<SyncResult> {
  const props = await db.select().from(properties);
  let inserted = 0;
  const errors: string[] = [];

  for (const p of props) {
    const feeds: [("airbnb" | "agoda"), string | null][] = [
      ["airbnb", p.airbnbIcalUrl],
      ["agoda", p.agodaIcalUrl],
    ];
    for (const [source, url] of feeds) {
      if (!url) continue;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = eventsToBookings(parseIcal(await res.text()), source, p.id);
        if (rows.length === 0) continue;
        const result = await db.insert(bookings).values(rows).onConflictDoNothing();
        inserted += result.rowsAffected;
      } catch (e) {
        // one bad feed must not kill the whole cron run
        errors.push(`${p.name} (${source}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return { inserted, errors };
}
