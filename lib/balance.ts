import { db } from "@/lib/db";
import { bookings, properties, transfers } from "@/db/schema";
import { lt, sum } from "drizzle-orm";
import { currentMonth, monthRange } from "@/lib/format";
import { netAcrossMonths } from "@/lib/report";

export type Balance = { earned: number; sent: number };

/** Per owner: net from completed months (check-in before this month) and all transfers. Held = earned - sent. */
// ponytail: scans every past booking and attributes it by current property owner (same as the reports);
// move the month grouping into SQL if bookings grow large.
export async function ownerBalances(): Promise<Map<number, Balance>> {
  const cutoff = monthRange(currentMonth()).start;
  const [props, past, sent] = await Promise.all([
    db.select().from(properties),
    db
      .select({ propertyId: bookings.propertyId, checkIn: bookings.checkIn, payoutIdr: bookings.payoutIdr })
      .from(bookings)
      .where(lt(bookings.checkIn, cutoff)),
    db
      .select({ ownerId: transfers.ownerId, total: sum(transfers.amountIdr) })
      .from(transfers)
      .groupBy(transfers.ownerId),
  ]);

  const balances = new Map<number, Balance>();
  const get = (ownerId: number) => {
    if (!balances.has(ownerId)) balances.set(ownerId, { earned: 0, sent: 0 });
    return balances.get(ownerId)!;
  };
  for (const p of props) {
    if (!p.ownerId) continue;
    get(p.ownerId).earned += netAcrossMonths(past.filter((b) => b.propertyId === p.id), p.commissionPct);
  }
  for (const t of sent) get(t.ownerId).sent += Number(t.total);
  return balances;
}
