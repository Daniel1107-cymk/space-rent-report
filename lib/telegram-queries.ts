import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { and, eq, gt, lte, type SQL } from "drizzle-orm";
import { daysBetween, getCleaningStatus } from "@/lib/cleaning";
import type { BookingLine, DigestInput } from "@/lib/telegram-messages";

/** Today's date in Asia/Jakarta as YYYY-MM-DD. */
export function todayWIB(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Check-ins from tomorrow through the next 7 days. */
export async function upcomingCheckIns(today = todayWIB()) {
  const rows = await db
    .select({
      propertyName: properties.name,
      guestName: bookings.guestName,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      nights: bookings.nights,
      source: bookings.source,
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .where(and(gt(bookings.checkIn, today), lte(bookings.checkIn, addDays(today, 7))))
    .orderBy(bookings.checkIn);
  return rows.map((r) => ({ ...r, daysUntil: daysBetween(r.checkIn, today) }));
}

export async function buildDigest(today = todayWIB()): Promise<DigestInput> {
  const [props, started, todayIn, todayOut, upcoming] = await Promise.all([
    db.select().from(properties),
    db.select().from(bookings).where(lte(bookings.checkIn, today)),
    lineQuery(eq(bookings.checkIn, today)),
    lineQuery(eq(bookings.checkOut, today)),
    upcomingCheckIns(today),
  ]);
  const { needsCleaning } = getCleaningStatus(props, started, today);
  return { today, checkIns: todayIn, checkOuts: todayOut, needsCleaning, upcoming };
}

export async function cleaningStatus(today = todayWIB()) {
  const [props, started] = await Promise.all([
    db.select().from(properties),
    db.select().from(bookings).where(lte(bookings.checkIn, today)),
  ]);
  return getCleaningStatus(props, started, today).needsCleaning;
}

function lineQuery(where: SQL): Promise<BookingLine[]> {
  return db
    .select({
      propertyName: properties.name,
      guestName: bookings.guestName,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      nights: bookings.nights,
      source: bookings.source,
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .where(where);
}

/** Property id -> name, for building alert lines from insert payloads. */
export async function propertyNames(): Promise<Map<number, string>> {
  const props = await db.select({ id: properties.id, name: properties.name }).from(properties);
  return new Map(props.map((p) => [p.id, p.name]));
}
