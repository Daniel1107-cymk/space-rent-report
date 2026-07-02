import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { and, gte, lt, eq, desc, type SQL } from "drizzle-orm";
import { currentMonth, monthRange } from "@/lib/format";
import { BookingsTable } from "./bookings-table";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string; source?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const propertyId = Number(params.property) || 0;
  const source = params.source ?? "";

  const { start, end } = monthRange(month);
  const filters: SQL[] = [gte(bookings.checkIn, start), lt(bookings.checkIn, end)];
  if (propertyId) filters.push(eq(bookings.propertyId, propertyId));
  if (source === "airbnb" || source === "agoda" || source === "manual") {
    filters.push(eq(bookings.source, source));
  }

  const [rows, allProperties] = await Promise.all([
    db.select().from(bookings).where(and(...filters)).orderBy(desc(bookings.checkIn)),
    db.select().from(properties),
  ]);

  return (
    <BookingsTable
      bookings={rows}
      properties={allProperties.map((p) => ({ id: p.id, name: p.name }))}
      month={month}
      propertyFilter={propertyId}
      sourceFilter={source}
    />
  );
}
