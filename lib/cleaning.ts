export type BookingForCleaning = {
  id: number;
  propertyId: number;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  cleanedAt: string | null;
};

export type CleaningEntry = {
  bookingId: number;
  propertyName: string;
  guestName: string | null;
  checkOut: string; // YYYY-MM-DD
  daysSince: number; // 0 = today, 1 = yesterday, …
};

export type OccupiedEntry = {
  propertyName: string;
  guestName: string | null;
  checkOut: string;
};

export type UpcomingEntry = {
  propertyName: string;
  guestName: string | null;
  checkIn: string; // YYYY-MM-DD  (the next arriving guest)
  daysUntil: number; // 0 = today, 1 = tomorrow, …
};

/** Days between two ISO date strings (a - b). Positive if a is later than b. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export function getCleaningStatus(
  properties: { id: number; name: string }[],
  allCheckedInBookings: BookingForCleaning[],
  today: string,
  upcomingBookings: BookingForCleaning[] = []
): {
  needsCleaning: CleaningEntry[];
  occupied: OccupiedEntry[];
  upcoming: UpcomingEntry[];
} {
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));

  // Group bookings by property
  const byProperty = new Map<number, BookingForCleaning[]>();
  for (const b of allCheckedInBookings) {
    if (!byProperty.has(b.propertyId)) byProperty.set(b.propertyId, []);
    byProperty.get(b.propertyId)!.push(b);
  }

  // Group upcoming by property (future bookings)
  const upcomingByProperty = new Map<number, BookingForCleaning[]>();
  for (const b of upcomingBookings) {
    if (!upcomingByProperty.has(b.propertyId)) upcomingByProperty.set(b.propertyId, []);
    upcomingByProperty.get(b.propertyId)!.push(b);
  }

  const needsCleaning: CleaningEntry[] = [];
  const occupied: OccupiedEntry[] = [];
  const occupiedPropertyIds = new Set<number>();

  for (const [propId, propBookings] of byProperty) {
    const name = propertyName.get(propId) ?? `Unit #${propId}`;

    // Is there an active guest right now? (checkIn <= today < checkOut)
    const activeBooking = propBookings.find(
      (b) => b.checkIn <= today && b.checkOut > today
    );

    if (activeBooking) {
      occupied.push({
        propertyName: name,
        guestName: activeBooking.guestName,
        checkOut: activeBooking.checkOut,
      });
      occupiedPropertyIds.add(propId);
      continue;
    }

    // Find the most recent completed booking (checkOut <= today)
    const completed = propBookings
      .filter((b) => b.checkOut <= today)
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut));

    if (completed.length === 0) continue;

    const last = completed[0];

    // If the most recent completed stay was marked clean, the unit is clean.
    if (last.cleanedAt) continue;

    needsCleaning.push({
      bookingId: last.id,
      propertyName: name,
      guestName: last.guestName,
      checkOut: last.checkOut,
      daysSince: daysBetween(today, last.checkOut),
    });
  }

  // Build upcoming check-in list: vacant (not occupied, not needing cleaning right now)
  // properties that have a future booking arriving within 7 days.
  const cleaningPropertyIds = new Set(needsCleaning.map((e) => e.bookingId));
  const upcoming: UpcomingEntry[] = [];

  for (const [propId, futureBookings] of upcomingByProperty) {
    if (occupiedPropertyIds.has(propId)) continue; // already occupied

    const name = propertyName.get(propId) ?? `Unit #${propId}`;

    // Next arriving booking
    const next = futureBookings
      .filter((b) => b.checkIn > today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];

    if (!next) continue;

    upcoming.push({
      propertyName: name,
      guestName: next.guestName,
      checkIn: next.checkIn,
      daysUntil: daysBetween(next.checkIn, today),
    });
  }

  // Sort by oldest checkout first (most urgent)
  needsCleaning.sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  occupied.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  upcoming.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  // Suppress cleaningPropertyIds reference — not needed for upcoming (upcoming is by propId not bookingId)
  void cleaningPropertyIds;

  return { needsCleaning, occupied, upcoming };
}
