import { db } from "@/lib/db";
import { bookings, properties, transfers } from "@/db/schema";
import { lt, sum } from "drizzle-orm";
import { currentMonth, monthRange } from "@/lib/format";
import { netAcrossMonths } from "@/lib/report";

/** Held balance per owner: net from completed months (check-in before this month) minus all transfers. */
// ponytail: scans every past booking and attributes it by current property owner (same as the reports);
// move the month grouping into SQL if bookings grow large.
export async function ownerBalances(): Promise<Map<number, number>> {
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

  const balances = new Map<number, number>();
  for (const p of props) {
    if (!p.ownerId) continue;
    const net = netAcrossMonths(past.filter((b) => b.propertyId === p.id), p.commissionPct);
    balances.set(p.ownerId, (balances.get(p.ownerId) ?? 0) + net);
  }
  for (const t of sent) {
    balances.set(t.ownerId, (balances.get(t.ownerId) ?? 0) - Number(t.total));
  }
  return balances;
}
