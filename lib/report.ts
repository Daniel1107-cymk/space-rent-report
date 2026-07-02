// Money path: commission math and per-period summaries.
// ponytail: a booking belongs to its check-in month (matches how Airbnb/Agoda pay out).

export function commissionFor(payoutIdr: number, commissionPct: number): number {
  return Math.round((payoutIdr * commissionPct) / 100);
}

export type BookingLike = {
  nights: number;
  payoutIdr: number;
};

export type Summary = {
  bookings: number;
  nights: number;
  gross: number;
  commission: number;
  net: number;
  /** 0-100, capped at 100 (a long booking can exceed the month's days) */
  occupancyPct: number;
};

export function summarize(
  bookings: BookingLike[],
  commissionPct: number,
  daysInPeriod: number
): Summary {
  const nights = bookings.reduce((sum, b) => sum + b.nights, 0);
  const gross = bookings.reduce((sum, b) => sum + b.payoutIdr, 0);
  const commission = commissionFor(gross, commissionPct);
  return {
    bookings: bookings.length,
    nights,
    gross,
    commission,
    net: gross - commission,
    occupancyPct: Math.min(100, Math.round((nights / daysInPeriod) * 100)),
  };
}
