import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { lte, gt } from "drizzle-orm";
import { getCleaningStatus } from "@/lib/cleaning";
import { CleaningDashboard } from "./cleaning-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebersihan — Space Rent",
  description: "Dashboard kebersihan unit untuk staf pembersih Space Rent",
};

/** Returns today's date in Asia/Jakarta (WIB, UTC+7) as "YYYY-MM-DD". */
function todayWIB(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export default async function CleaningPortalPage() {
  const today = todayWIB();

  const [allProperties, checkedInBookings, futureBookings] = await Promise.all([
    db.select().from(properties),
    // Bookings that have already started (for occupied / needs-cleaning detection)
    db.select().from(bookings).where(lte(bookings.checkIn, today)),
    // Future bookings (for upcoming check-in warnings)
    db.select().from(bookings).where(gt(bookings.checkIn, today)),
  ]);

  const { needsCleaning, occupied, upcoming } = getCleaningStatus(
    allProperties,
    checkedInBookings,
    today,
    futureBookings
  );

  return (
    <CleaningDashboard
      needsCleaning={needsCleaning}
      occupied={occupied}
      upcoming={upcoming}
      today={today}
    />
  );
}
