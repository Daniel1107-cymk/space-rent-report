import { describe, it, expect } from "vitest";
import { parseIcal, eventsToBookings } from "./ical";

// Shape of a real Airbnb calendar export: folded DESCRIPTION line, DATE values,
// one blocked range, one reservation carrying the HM confirmation code.
const AIRBNB_ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260710",
  "DTEND;VALUE=DATE:20260713",
  "UID:1418fb9d-airbnb@airbnb.com",
  "SUMMARY:Reserved",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
  " tails/HMABC12345\\nPhone Number (Last 4 Digits): 1234",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260720",
  "DTEND;VALUE=DATE:20260722",
  "UID:blocked-1@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("iCal sync", () => {
  it("parses an Airbnb feed into bookings, skipping blocked ranges", () => {
    const events = parseIcal(AIRBNB_ICS);
    expect(events).toHaveLength(2);

    const rows = eventsToBookings(events, "airbnb", 7);
    expect(rows).toEqual([
      {
        propertyId: 7,
        source: "airbnb",
        externalId: "HMABC12345", // from folded reservation URL, matches CSV confirmation code
        guestName: "",
        checkIn: "2026-07-10",
        checkOut: "2026-07-13",
        nights: 3,
        payoutIdr: 0,
      },
    ]);
  });

  it("falls back to UID when no confirmation code is present (Agoda)", () => {
    const events = parseIcal(
      "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260701\r\nDTEND;VALUE=DATE:20260702\r\nUID:agoda-987654321\r\nSUMMARY:Budi S\r\nEND:VEVENT"
    );
    const rows = eventsToBookings(events, "agoda", 1);
    expect(rows[0].externalId).toBe("agoda-987654321");
    expect(rows[0].guestName).toBe("Budi S");
  });
});
