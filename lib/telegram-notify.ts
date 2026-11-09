import { sendTelegram } from "@/lib/telegram";
import {
  formatCancellation,
  formatNewBooking,
  type BookingLine,
} from "@/lib/telegram-messages";

/** Send one message per new / cancelled booking. Never throws. */
export async function notifyBookingChanges(changes: {
  added?: BookingLine[];
  cancelled?: BookingLine[];
}) {
  for (const b of changes.added ?? []) await sendTelegram(formatNewBooking(b));
  for (const b of changes.cancelled ?? []) await sendTelegram(formatCancellation(b));
}
