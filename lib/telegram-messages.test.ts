import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  formatCancellation,
  formatDigest,
  formatNewBooking,
  formatUpcoming,
} from "./telegram-messages";

const b = {
  propertyName: "Villa <A>",
  guestName: "Tom & Jerry",
  checkIn: "2026-11-12",
  checkOut: "2026-11-15",
  nights: 3,
  source: "airbnb",
};

describe("telegram messages", () => {
  it("escapes HTML in names", () => {
    expect(escapeHtml("<b>&")).toBe("&lt;b&gt;&amp;");
    const msg = formatNewBooking(b);
    expect(msg).toContain("Villa &lt;A&gt;");
    expect(msg).toContain("Tom &amp; Jerry");
    expect(msg).toContain("12 Nov → 15 Nov, 3 malam");
  });

  it("formats cancellations", () => {
    expect(formatCancellation(b)).toContain("dibatalkan");
  });

  it("falls back for blank guest names and handles empty upcoming", () => {
    expect(formatNewBooking({ ...b, guestName: "" })).toContain("tamu");
    expect(formatUpcoming([])).toContain("Tidak ada");
  });

  it("labels upcoming days", () => {
    expect(formatUpcoming([{ ...b, daysUntil: 1 }])).toContain("besok");
    expect(formatUpcoming([{ ...b, daysUntil: 4 }])).toContain("4 hari lagi");
  });

  it("builds a digest with all sections", () => {
    const msg = formatDigest({
      today: "2026-11-09",
      checkIns: [b],
      checkOuts: [],
      needsCleaning: [{ propertyName: "Villa B", checkOut: "2026-11-08", daysSince: 1 }],
      upcoming: [{ ...b, daysUntil: 3 }],
    });
    expect(msg).toContain("Ringkasan 9 Nov");
    expect(msg).toContain("Check-in hari ini");
    expect(msg).toContain("Tidak ada check-out hari ini");
    expect(msg).toContain("Perlu dibersihkan");
    expect(msg).toContain("Check-in 7 hari ke depan");
  });
});
