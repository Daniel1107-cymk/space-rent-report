import { db } from "@/lib/db";
import { bookings, properties, users } from "@/db/schema";
import { and, gte, gt, isNull, lt, lte, eq } from "drizzle-orm";
import { currentMonth, monthRange, monthLabel, daysInMonth, formatIDR, dateLabel } from "@/lib/format";
import { summarize } from "@/lib/report";
import { MonthPicker } from "@/components/month-picker";
import { Stat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PropertyOverviewChart } from "@/components/property-overview-chart";
import { UserIcon, BedDoubleIcon, SparklesIcon, ArrowRightIcon } from "lucide-react";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const month = (await searchParams).month ?? currentMonth();
  const { start, end } = monthRange(month);
  const days = daysInMonth(month);

  /** Today as YYYY-MM-DD in Asia/Jakarta (WIB, UTC+7). */
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());

  /** Days between two ISO date strings (positive if a is later). */
  function daysBetween(a: string, b: string) {
    return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
  }

  const [allProperties, owners, monthBookings, todayBookings, checkoutBookings] = await Promise.all([
    db.select().from(properties),
    db.select().from(users).where(eq(users.role, "owner")),
    db
      .select()
      .from(bookings)
      .where(and(gte(bookings.checkIn, start), lt(bookings.checkIn, end))),
    // Occupied today: checkIn <= today < checkOut
    db
      .select()
      .from(bookings)
      .where(and(lte(bookings.checkIn, today), gt(bookings.checkOut, today))),
    // Candidates for cleaning: checked in on or before today, not yet marked clean
    db
      .select()
      .from(bookings)
      .where(and(lte(bookings.checkIn, today), isNull(bookings.cleanedAt))),
  ]);

  const ownerName = new Map(owners.map((o) => [o.id, o.name]));

  // Map propertyId -> active booking today (first match)
  const activeBookingByProperty = new Map(
    todayBookings.map((b) => [b.propertyId, b])
  );

  // Derive needs-cleaning list (same logic as /admin/cleaning)
  const byProperty = new Map<number, typeof checkoutBookings>();
  for (const b of checkoutBookings) {
    if (!byProperty.has(b.propertyId)) byProperty.set(b.propertyId, []);
    byProperty.get(b.propertyId)!.push(b);
  }
  const propertyName = new Map(allProperties.map((p) => [p.id, p.name]));

  const needsCleaning: { bookingId: number; propertyName: string; guestName: string | null; checkOut: string; daysSince: number }[] = [];
  for (const [propId, propBookings] of byProperty) {
    const active = propBookings.find((b) => b.checkIn <= today && b.checkOut > today);
    if (active) continue; // unit is occupied — skip
    const completed = propBookings
      .filter((b) => b.checkOut <= today)
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut));
    if (!completed.length) continue;
    const last = completed[0];
    needsCleaning.push({
      bookingId: last.id,
      propertyName: propertyName.get(propId) ?? `Unit #${propId}`,
      guestName: last.guestName,
      checkOut: last.checkOut,
      daysSince: daysBetween(today, last.checkOut),
    });
  }
  needsCleaning.sort((a, b) => a.checkOut.localeCompare(b.checkOut)); // oldest first = most urgent

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

  const occupiedCount = activeBookingByProperty.size;
  const vacantCount = allProperties.length - occupiedCount;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ringkasan</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
        </div>
        <MonthPicker month={month} />
      </div>

      {/* ── Occupancy Grid ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Status Unit Hari Ini</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-rose-500" />
              {occupiedCount} Terisi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
              {vacantCount} Kosong
            </span>
          </div>
        </div>

        {allProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada properti.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allProperties.map((property) => {
              const booking = activeBookingByProperty.get(property.id);
              const occupied = !!booking;
              return (
                <div
                  key={property.id}
                  className={`relative rounded-xl border p-4 transition-colors ${
                    occupied
                      ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  }`}
                >
                  {/* Status dot */}
                  <span
                    className={`absolute right-3 top-3 size-2.5 rounded-full ${
                      occupied ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />

                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        occupied
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                      }`}
                    >
                      <BedDoubleIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">{property.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {property.ownerId ? (ownerName.get(property.ownerId) ?? "—") : "—"}
                      </p>
                    </div>
                  </div>

                  {occupied && booking ? (
                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{booking.guestName ?? "Tamu"}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 capitalize text-xs">
                          {booking.source}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel(booking.checkIn)} – {dateLabel(booking.checkOut)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Kosong
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Needs Cleaning ────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Perlu Dibersihkan</h2>
          <Link
            href="/admin/cleaning"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Lihat semua <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        {needsCleaning.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-5">
            <SparklesIcon className="size-5 shrink-0 text-emerald-500" />
            <p className="text-sm font-medium">Semua unit bersih</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y rounded-xl border overflow-hidden">
            {needsCleaning.map((entry) => {
              const urgent = entry.daysSince >= 2;
              return (
                <div key={entry.bookingId} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      urgent
                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                    }`}
                  >
                    <SparklesIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.propertyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.guestName ? `${entry.guestName} · ` : ""}
                      Check-out {dateLabel(entry.checkOut)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-xs ${
                      urgent
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {entry.daysSince === 0 ? "Hari ini" : entry.daysSince === 1 ? "Kemarin" : `${entry.daysSince} hari lalu`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Monthly Summary ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-y py-5 md:grid-cols-4">
        <Stat label="Pembayaran kotor" value={formatIDR(totalGross)} />
        <Stat label="Komisi yang diperoleh" value={formatIDR(totalCommission)} accent />
        <Stat label="Malam dipesan" value={String(totalNights)} />
        <Stat label="Pemesanan" value={String(totalBookings)} />
      </div>

      {allProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Belum ada properti</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mulai dengan menambahkan properti di halaman{" "}
            <Link href="/admin/properties" className="underline underline-offset-4">
              Properti
            </Link>
            .
          </p>
        </div>
      ) : (
        <PropertyOverviewChart
          data={rows.map(({ property, summary }) => ({
            name: property.name,
            gross: summary.gross,
            commission: summary.commission,
            net: summary.net,
            occupancyPct: summary.occupancyPct,
            nights: summary.nights,
          }))}
        />
      )}
    </div>
  );
}
