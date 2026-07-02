import { describe, it, expect } from "vitest";
import { commissionFor, summarize } from "./report";
import { detectFormat, normalizeDate, parseAmount, parseRows } from "./csv";
import { monthRange, daysInMonth } from "./format";

describe("commission math", () => {
  it("computes commission and net", () => {
    expect(commissionFor(1_000_000, 20)).toBe(200_000);
    expect(commissionFor(1_500_000, 15)).toBe(225_000);
    // rounds to whole rupiah
    expect(commissionFor(999, 33.3)).toBe(333);
  });

  it("summarizes a month", () => {
    const s = summarize(
      [
        { nights: 3, payoutIdr: 1_500_000 },
        { nights: 2, payoutIdr: 900_000 },
      ],
      20,
      30
    );
    expect(s).toEqual({
      bookings: 2,
      nights: 5,
      gross: 2_400_000,
      commission: 480_000,
      net: 1_920_000,
      occupancyPct: 17,
    });
  });

  it("caps occupancy at 100", () => {
    const s = summarize([{ nights: 45, payoutIdr: 1 }], 0, 30);
    expect(s.occupancyPct).toBe(100);
  });
});

describe("month helpers", () => {
  it("computes month range with exclusive end", () => {
    expect(monthRange("2026-07")).toEqual({ start: "2026-07-01", end: "2026-08-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
  it("knows days in month", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("date normalization", () => {
  it("handles the formats both platforms emit", () => {
    expect(normalizeDate("2026-07-04")).toBe("2026-07-04");
    expect(normalizeDate("07/04/2026")).toBe("2026-07-04");
    expect(normalizeDate("4-Jul-2026")).toBe("2026-07-04");
    expect(normalizeDate("04 Jul 2026")).toBe("2026-07-04");
    expect(normalizeDate("garbage")).toBe("");
  });
});

describe("amount parsing", () => {
  it("handles Indonesian and US formats", () => {
    expect(parseAmount("Rp 1.500.000")).toBe(1_500_000);
    expect(parseAmount("1,500,000.00")).toBe(1_500_000);
    expect(parseAmount("1500000")).toBe(1_500_000);
    expect(parseAmount("1.234,56")).toBe(1_235);
    expect(parseAmount("")).toBe(0);
  });
});

describe("airbnb csv", () => {
  const headers = ["Date", "Type", "Confirmation Code", "Start Date", "Nights", "Guest", "Listing", "Amount"];
  it("is detected", () => {
    expect(detectFormat(headers)).toBe("airbnb");
  });
  it("parses reservation rows and skips payout rows", () => {
    const rows = [
      {
        Type: "Reservation",
        "Confirmation Code": "HMABC123",
        "Start Date": "07/04/2026",
        Nights: "3",
        Guest: "Putu Wirawan",
        Listing: "Villa Sari",
        Amount: "1500000",
      },
      { Type: "Payout", Amount: "1500000" },
    ];
    const parsed = parseRows("airbnb", rows as Record<string, string>[]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      source: "airbnb",
      externalId: "HMABC123",
      checkIn: "2026-07-04",
      checkOut: "2026-07-07",
      nights: 3,
      payoutIdr: 1_500_000,
      listing: "Villa Sari",
    });
  });
});

describe("airbnb reservations csv (real export shape)", () => {
  const headers = ["Confirmation code", "Status", "Guest name", "Contact", "# of adults", "Start date", "End date", "# of nights", "Booked", "Listing", "Earnings"];
  it("is detected", () => {
    expect(detectFormat(headers)).toBe("airbnb");
  });
  it("parses DD/MM/YYYY dates, Earnings amounts, and skips cancelled rows", () => {
    const rows = [
      {
        "Confirmation code": "HMERBC93YB",
        Status: "Currently hosting",
        "Guest name": "Muhammad Zuhairi",
        "Start date": "25/06/2026",
        "End date": "06/07/2026",
        "# of nights": "11",
        Listing: "Space Rent @ Citra Plaza Apartment 37th Floor View",
        Earnings: "Rp 4,502,446.00",
      },
      {
        // ambiguous 12/06 vs 06/12: the nights column must disambiguate to 12 Jun -> 14 Jun
        "Confirmation code": "HMZCST4MJ8",
        Status: "Past guest",
        "Guest name": "Kausalya Mahalingam",
        "Start date": "12/06/2026",
        "End date": "14/06/2026",
        "# of nights": "2",
        Listing: "Space Rent @ Citra Plaza Apartment 37th Floor View",
        Earnings: "Rp 927,991.00",
      },
      {
        "Confirmation code": "HM4WYNP2D4",
        Status: "Cancelled by guest",
        "Guest name": "Kausalya",
        "Start date": "27/05/2026",
        "End date": "01/06/2026",
        "# of nights": "5",
        Listing: "Space Rent @ Citra Plaza Apartment 37th Floor View",
        Earnings: "Rp 0.00",
      },
    ];
    const parsed = parseRows("airbnb", rows as Record<string, string>[]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      externalId: "HMERBC93YB",
      checkIn: "2026-06-25",
      checkOut: "2026-07-06",
      nights: 11,
      payoutIdr: 4_502_446,
    });
    expect(parsed[1]).toMatchObject({
      checkIn: "2026-06-12",
      checkOut: "2026-06-14",
      nights: 2,
      payoutIdr: 927_991,
    });
  });
});

describe("agoda booking report csv (real export shape)", () => {
  const headers = ["PropertyName", "BookingId", "GuestName", "CheckinDate", "CheckoutDate", "RoomTypeName", "Adults", "Children", "PaymentModel"];
  it("is detected", () => {
    expect(detectFormat(headers)).toBe("agoda");
  });
  it("parses MM/DD dates with time suffix and defaults payout to 0 (no amount column)", () => {
    const rows = [
      {
        PropertyName: "Space Rent @ Citra Plaza Apartment 32th Floor View",
        BookingId: "1973595810",
        GuestName: "Sila Adifia",
        CheckinDate: "01/16/2026 00:00:00",
        CheckoutDate: "01/18/2026 00:00:00",
      },
      {
        // ambiguous 03/07 -> must read as Mar 7 (MM/DD), 1 night
        PropertyName: "Space Rent @ Citra Plaza Apartment 32th Floor View",
        BookingId: "1693008966",
        GuestName: "Hyun Jun Ahn",
        CheckinDate: "03/07/2026 00:00:00",
        CheckoutDate: "03/08/2026 00:00:00",
      },
    ];
    const parsed = parseRows("agoda", rows as Record<string, string>[]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      externalId: "1973595810",
      checkIn: "2026-01-16",
      checkOut: "2026-01-18",
      nights: 2,
      payoutIdr: 0,
      listing: "Space Rent @ Citra Plaza Apartment 32th Floor View",
    });
    expect(parsed[1]).toMatchObject({ checkIn: "2026-03-07", checkOut: "2026-03-08", nights: 1 });
  });
});

describe("agoda csv", () => {
  const headers = ["Booking ID", "Guest Name", "Check-In", "Check-Out", "Net To Hotel", "Property Name"];
  it("is detected", () => {
    expect(detectFormat(headers)).toBe("agoda");
  });
  it("parses rows and derives nights", () => {
    const rows = [
      {
        "Booking ID": "987654321",
        "Guest Name": "Dewi Lestari",
        "Check-In": "2026-07-10",
        "Check-Out": "2026-07-12",
        "Net To Hotel": "Rp 1.800.000",
        "Property Name": "Villa Sari",
      },
    ];
    const parsed = parseRows("agoda", rows as Record<string, string>[]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      source: "agoda",
      externalId: "987654321",
      checkIn: "2026-07-10",
      checkOut: "2026-07-12",
      nights: 2,
      payoutIdr: 1_800_000,
    });
  });
});
