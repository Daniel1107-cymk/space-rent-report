import { db } from "@/lib/db";
import { bookings, properties } from "@/db/schema";
import { lte } from "drizzle-orm";
import { getCleaningStatus } from "@/lib/cleaning";
import { CleaningList } from "./cleaning-list";

/** Returns today's date in Asia/Jakarta (WIB, UTC+7) as "YYYY-MM-DD". */
function todayWIB(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export default async function CleaningPage() {
  const today = todayWIB();

  const [allProperties, allBookings] = await Promise.all([
    db.select().from(properties),
    db
      .select()
      .from(bookings)
      .where(lte(bookings.checkIn, today)),
  ]);

  const { needsCleaning, occupied } = getCleaningStatus(allProperties, allBookings, today);

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
