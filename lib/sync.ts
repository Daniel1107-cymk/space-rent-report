import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { parseIcal, eventsToBookings } from "@/lib/ical";
import { todayWIB } from "@/lib/telegram-queries";
import type { BookingLine } from "@/lib/telegram-messages";

export type SyncResult = {
  inserted: number;
  errors: string[];
  /** Newly inserted bookings, for alerts. */
  added: BookingLine[];
  /** Future bookings that disappeared from their feed and were removed. */
  cancelled: BookingLine[];
};

/**
 * Fetch every property's iCal feeds, insert new bookings (dedupe via unique index) and
 * remove future bookings that the feed no longer lists (cancellations).
 */
export async function syncAllProperties(): Promise<SyncResult> {
  const props = await db.select().from(properties);
  const today = todayWIB();
  const added: BookingLine[] = [];
  const cancelled: BookingLine[] = [];
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
        // An empty feed is more likely an outage than "everything cancelled": touch nothing.
        if (rows.length === 0) continue;

        const insertedRows = await db.insert(bookings).values(rows).onConflictDoNothing().returning();
        for (const b of insertedRows) {
          added.push({
            propertyName: p.name,
            guestName: b.guestName,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            nights: b.nights,
            source,
          });
        }

        // Cancellations: future bookings of this source missing from the feed. A booking counts as
        // still present if its id OR its exact dates match a feed row (CSV-imported ids can differ
        // from iCal UIDs, so dates guard against deleting those).
        const feedIds = new Set(rows.map((r) => r.externalId));
        const feedDates = new Set(rows.map((r) => `${r.checkIn}|${r.checkOut}`));
        const future = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.propertyId, p.id),
              eq(bookings.source, source),
              isNotNull(bookings.externalId),
              gte(bookings.checkIn, today)
            )
          );
        const gone = future.filter(
          (b) => !feedIds.has(b.externalId!) && !feedDates.has(`${b.checkIn}|${b.checkOut}`)
        );
        if (gone.length > 0) {
          await db.delete(bookings).where(inArray(bookings.id, gone.map((b) => b.id)));
          for (const b of gone) {
            cancelled.push({
              propertyName: p.name,
              guestName: b.guestName,
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              nights: b.nights,
              source,
            });
          }
        }
      } catch (e) {
        // one bad feed must not kill the whole cron run
        errors.push(`${p.name} (${source}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return { inserted: added.length, errors, added, cancelled };
}
