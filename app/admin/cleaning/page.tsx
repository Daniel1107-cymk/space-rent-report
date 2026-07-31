import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { lte } from "drizzle-orm";
import { CleaningList, type CleaningEntry, type OccupiedEntry } from "./cleaning-list";

/** Returns today's date in Asia/Jakarta (WIB, UTC+7) as "YYYY-MM-DD". */
function todayWIB(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

/** Days between two ISO date strings (a - b). Positive if a is later than b. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export default async function CleaningPage() {
  const today = todayWIB();

  const [allProperties, allBookings] = await Promise.all([
    db.select().from(properties),
    db
      .select()
      .from(bookings)
      // Only bookings that have checked out or are currently active
      .where(lte(bookings.checkIn, today)),
  ]);

  const propertyName = new Map(allProperties.map((p) => [p.id, p.name]));

  // Group bookings by property
  const byProperty = new Map<number, typeof allBookings>();
  for (const b of allBookings) {
    if (!byProperty.has(b.propertyId)) byProperty.set(b.propertyId, []);
    byProperty.get(b.propertyId)!.push(b);
  }

  const needsCleaning: CleaningEntry[] = [];
  const occupied: OccupiedEntry[] = [];

  for (const [propId, propBookings] of byProperty) {
    const name = propertyName.get(propId) ?? `Unit #${propId}`;

    // Is there an active guest right now? (checkIn <= today < checkOut)
    // Note: checkOut is the *departure* date — if checkOut === today the guest
    // has already left and the unit needs cleaning.
    const activeBooking = propBookings.find(
      (b) => b.checkIn <= today && b.checkOut > today
    );

    if (activeBooking) {
      // Unit is currently occupied — show in "Occupied" section
      occupied.push({
        propertyName: name,
        guestName: activeBooking.guestName,
        checkOut: activeBooking.checkOut,
      });
      continue;
    }

    // Find the most recent completed booking (checkOut <= today, no active guest)
    const completed = propBookings
      .filter((b) => b.checkOut <= today)
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut));

    if (completed.length === 0) continue;

    const last = completed[0];

    // If already marked clean, skip
    if (last.cleanedAt) continue;

    needsCleaning.push({
      bookingId: last.id,
      propertyName: name,
      guestName: last.guestName,
      checkOut: last.checkOut,
      daysSince: daysBetween(today, last.checkOut),
    });
  }

  // Sort by oldest checkout first (most urgent)
  needsCleaning.sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  occupied.sort((a, b) => a.propertyName.localeCompare(b.propertyName));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Kebersihan</h1>
        <p className="text-sm text-muted-foreground">
          Unit yang perlu dibersihkan setelah tamu check-out. Diperbarui otomatis berdasarkan data pemesanan.
        </p>
      </div>

      <CleaningList needsCleaning={needsCleaning} occupied={occupied} />
    </div>
  );
}
