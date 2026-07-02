import { db } from "@/lib/db";
import { bookings, properties, users } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { currentMonth, monthRange, monthLabel, daysInMonth, formatIDR } from "@/lib/format";
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
import Link from "next/link";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const month = (await searchParams).month ?? currentMonth();
  const { start, end } = monthRange(month);
  const days = daysInMonth(month);

  const [allProperties, owners, monthBookings] = await Promise.all([
    db.select().from(properties),
    db.select().from(users).where(eq(users.role, "owner")),
    db
      .select()
      .from(bookings)
      .where(and(gte(bookings.checkIn, start), lt(bookings.checkIn, end))),
  ]);

  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const rows = allProperties.map((p) => ({
    property: p,
    summary: summarize(
      monthBookings.filter((b) => b.propertyId === p.id),
      p.commissionPct,
      days
    ),
  }));

  const totalGross = rows.reduce((s, r) => s + r.summary.gross, 0);
  const totalCommission = rows.reduce((s, r) => s + r.summary.commission, 0);
  const totalNights = rows.reduce((s, r) => s + r.summary.nights, 0);
  const totalBookings = rows.reduce((s, r) => s + r.summary.bookings, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
        </div>
        <MonthPicker month={month} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-y py-5 md:grid-cols-4">
        <Stat label="Gross payouts" value={formatIDR(totalGross)} />
        <Stat label="Commission earned" value={formatIDR(totalCommission)} accent />
        <Stat label="Nights booked" value={String(totalNights)} />
        <Stat label="Bookings" value={String(totalBookings)} />
      </div>

      {allProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No properties yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by adding a property on the{" "}
            <Link href="/admin/properties" className="underline underline-offset-4">
              Properties
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Nights</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Owner net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ property, summary }) => (
              <TableRow key={property.id}>
                <TableCell className="font-medium">{property.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {property.ownerId ? (ownerName.get(property.ownerId) ?? "-") : "-"}
                </TableCell>
                <TableCell className="tabular text-right">{summary.nights}</TableCell>
                <TableCell className="tabular text-right">{summary.occupancyPct}%</TableCell>
                <TableCell className="tabular text-right">{formatIDR(summary.gross)}</TableCell>
                <TableCell className="tabular text-right">
                  {formatIDR(summary.commission)}
                </TableCell>
                <TableCell className="tabular text-right">{formatIDR(summary.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
