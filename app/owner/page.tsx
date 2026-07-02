import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { and, gte, lt, eq, inArray, asc } from "drizzle-orm";
import { currentMonth, monthRange, monthLabel, daysInMonth, formatIDR, dateLabel } from "@/lib/format";
import { summarize } from "@/lib/report";
import { MonthPicker } from "@/components/month-picker";
import { Stat } from "@/components/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OwnerReport({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireRole("owner");
  const month = (await searchParams).month ?? currentMonth();
  const { start, end } = monthRange(month);
  const days = daysInMonth(month);

  const myProperties = await db
    .select()
    .from(properties)
    .where(eq(properties.ownerId, session.uid));

  const myBookings =
    myProperties.length === 0
      ? []
      : await db
          .select()
          .from(bookings)
          .where(
            and(
              inArray(
                bookings.propertyId,
                myProperties.map((p) => p.id)
              ),
              gte(bookings.checkIn, start),
              lt(bookings.checkIn, end)
            )
          )
          .orderBy(asc(bookings.checkIn));

  const reports = myProperties.map((p) => ({
    property: p,
    bookings: myBookings.filter((b) => b.propertyId === p.id),
    summary: summarize(
      myBookings.filter((b) => b.propertyId === p.id),
      p.commissionPct,
      days
    ),
  }));

  const totalNet = reports.reduce((s, r) => s + r.summary.net, 0);
  const totalNights = reports.reduce((s, r) => s + r.summary.nights, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your report</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
        </div>
        <MonthPicker month={month} />
      </div>

      {myProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No properties assigned to you yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your property manager if this looks wrong.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border bg-card px-6 py-6">
            <p className="text-sm text-muted-foreground">Your net payout, {monthLabel(month)}</p>
            <p className="tabular mt-2 text-4xl font-semibold tracking-tight text-positive">
              {formatIDR(totalNet)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalNights} night{totalNights === 1 ? "" : "s"} booked across{" "}
              {myProperties.length} propert{myProperties.length === 1 ? "y" : "ies"},
              after commission.
            </p>
          </div>

          {reports.map(({ property, bookings: rows, summary }) => (
            <section key={property.id} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                <h2 className="font-semibold tracking-tight">{property.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {property.commissionPct}% commission
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                <Stat label="Days rented" value={String(summary.nights)} />
                <Stat label="Occupancy" value={`${summary.occupancyPct}%`} />
                <Stat label="Gross payout" value={formatIDR(summary.gross)} />
                <Stat label="Your net" value={formatIDR(summary.net)} accent />
              </div>

              {rows.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No bookings this month.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead className="text-right">Nights</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                      <TableHead className="text-right">Your net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.guestName || "Guest"}</TableCell>
                        <TableCell className="tabular">{dateLabel(b.checkIn)}</TableCell>
                        <TableCell className="tabular text-right">{b.nights}</TableCell>
                        <TableCell className="tabular text-right">
                          {formatIDR(b.payoutIdr)}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatIDR(
                            b.payoutIdr -
                              Math.round((b.payoutIdr * property.commissionPct) / 100)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
