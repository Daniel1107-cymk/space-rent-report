import { describe, it, expect } from "vitest";
import { getCleaningStatus } from "./cleaning";

describe("getCleaningStatus", () => {
  const properties = [
    { id: 1, name: "Villa A" },
    { id: 2, name: "Villa B" },
  ];
  const today = "2026-08-05";

  it("skips property if the latest completed booking is marked clean, even if an older booking was uncleaned", () => {
    const bookings = [
      {
        id: 101,
        propertyId: 1,
        guestName: "Old Guest",
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        cleanedAt: null, // Older booking never marked clean
      },
      {
        id: 102,
        propertyId: 1,
        guestName: "Recent Guest",
        checkIn: "2026-08-01",
        checkOut: "2026-08-04",
        cleanedAt: "2026-08-04T12:00:00Z", // Marked clean!
      },
    ];

    const { needsCleaning } = getCleaningStatus(properties, bookings, today);

    expect(needsCleaning).toHaveLength(0);
  });

  it("includes property in needsCleaning if the latest completed booking is not marked clean", () => {
    const bookings = [
      {
        id: 101,
        propertyId: 1,
        guestName: "Guest 1",
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        cleanedAt: "2026-07-05T12:00:00Z",
      },
      {
        id: 102,
        propertyId: 1,
        guestName: "Guest 2",
        checkIn: "2026-08-01",
        checkOut: "2026-08-04",
        cleanedAt: null, // Not marked clean!
      },
    ];

    const { needsCleaning } = getCleaningStatus(properties, bookings, today);

    expect(needsCleaning).toHaveLength(1);
    expect(needsCleaning[0]).toMatchObject({
      bookingId: 102,
      propertyName: "Villa A",
      guestName: "Guest 2",
      checkOut: "2026-08-04",
      daysSince: 1,
    });
  });

  it("puts active stay into occupied and skips needsCleaning", () => {
    const bookings = [
      {
        id: 101,
        propertyId: 1,
        guestName: "Checked Out Guest",
        checkIn: "2026-07-28",
        checkOut: "2026-08-01",
        cleanedAt: null,
      },
      {
        id: 102,
        propertyId: 1,
        guestName: "Active Guest",
        checkIn: "2026-08-02",
        checkOut: "2026-08-10",
        cleanedAt: null,
      },
    ];

    const { needsCleaning, occupied } = getCleaningStatus(properties, bookings, today);

    expect(needsCleaning).toHaveLength(0);
    expect(occupied).toHaveLength(1);
    expect(occupied[0]).toMatchObject({
      propertyName: "Villa A",
      guestName: "Active Guest",
    });
  });
});
