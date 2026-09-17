import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, properties, users } from "@/db/schema";
import { and, gte, lt, eq, inArray, asc } from "drizzle-orm";
import { currentMonth, monthRangeSpan, monthsBetween, monthLabel, daysInMonth, formatIDR } from "@/lib/format";
import { summarize } from "@/lib/report";
import { MonthRangePicker } from "@/components/month-range-picker";
import { OwnerFilter } from "@/components/owner-filter";
import { Stat } from "@/components/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; owner?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const from = params.from ?? currentMonth();
  const to = params.to && params.to >= from ? params.to : from;
  const ownerId = params.owner ?? "all";
  const { start, end } = monthRangeSpan(from, to);
  const days = monthsBetween(from, to).reduce((sum, m) => sum + daysInMonth(m), 0);

  const owners = await db.select().from(users).where(eq(users.role, "owner"));

  const allProperties =
    ownerId === "all"
      ? await db.select().from(properties)
      : await db.select().from(properties).where(eq(properties.ownerId, Number(ownerId)));

  const allBookings =
    allProperties.length === 0
      ? []
      : await db
          .select()
          .from(bookings)
          .where(
            and(
              inArray(bookings.propertyId, allProperties.map((p) => p.id)),
              gte(bookings.checkIn, start),
              lt(bookings.checkIn, end)
            )
          )
          .orderBy(asc(bookings.checkIn));

  const ownerReports = owners
    .filter((o) => ownerId === "all" || o.id === Number(ownerId))
    .map((owner) => {
      const ownerProperties = allProperties.filter((p) => p.ownerId === owner.id);
      const propertyReports = ownerProperties.map((p) => {
        const propertyBookings = allBookings.filter((b) => b.propertyId === p.id);
        return { property: p, summary: summarize(propertyBookings, p.commissionPct, days) };
      });
      const summary = {
        gross: propertyReports.reduce((s, r) => s + r.summary.gross, 0),
        commission: propertyReports.reduce((s, r) => s + r.summary.commission, 0),
        net: propertyReports.reduce((s, r) => s + r.summary.net, 0),
        nights: propertyReports.reduce((s, r) => s + r.summary.nights, 0),
      };
      return { owner, propertyReports, summary };
    })
    .filter((r) => r.propertyReports.length > 0);

  const totalGross = ownerReports.reduce((s, r) => s + r.summary.gross, 0);
  const totalCommission = ownerReports.reduce((s, r) => s + r.summary.commission, 0);
  const totalNet = ownerReports.reduce((s, r) => s + r.summary.net, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            {from === to ? monthLabel(from) : `${monthLabel(from)} – ${monthLabel(to)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OwnerFilter ownerId={ownerId} owners={owners} />
          <MonthRangePicker from={from} to={to} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-5 rounded-2xl border bg-card px-6 py-6">
        <Stat label="Pembayaran kotor" value={formatIDR(totalGross)} />
        <Stat label="Komisi" value={formatIDR(totalCommission)} />
        <Stat label="Bersih pemilik" value={formatIDR(totalNet)} accent />
      </div>

      {ownerReports.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Tidak ada data pada periode ini</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemilik</TableHead>
              <TableHead>Properti</TableHead>
              <TableHead>Komisi</TableHead>
              <TableHead className="text-right">Malam</TableHead>
              <TableHead className="text-right">Kotor</TableHead>
              <TableHead className="text-right">Komisi (Rp)</TableHead>
              <TableHead className="text-right">Bersih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ownerReports.flatMap(({ owner, propertyReports }) =>
              propertyReports.map(({ property, summary }) => (
                <TableRow key={property.id}>
                  <TableCell>{owner.name}</TableCell>
                  <TableCell>{property.name}</TableCell>
                  <TableCell className="tabular">{property.commissionPct}%</TableCell>
                  <TableCell className="tabular text-right">{summary.nights}</TableCell>
                  <TableCell className="tabular text-right">{formatIDR(summary.gross)}</TableCell>
                  <TableCell className="tabular text-right">{formatIDR(summary.commission)}</TableCell>
                  <TableCell className="tabular text-right">{formatIDR(summary.net)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
