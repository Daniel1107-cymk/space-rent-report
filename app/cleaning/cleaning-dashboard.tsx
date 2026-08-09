"use client";

import { useTransition } from "react";
import { markBookingCleaned } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CleaningEntry, OccupiedEntry, UpcomingEntry } from "@/lib/cleaning";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysSinceLabel(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

function daysUntilLabel(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}

// ─── Mark-cleaned button ───────────────────────────────────────────────────────

function MarkCleanButton({ bookingId }: { bookingId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      id={`mark-clean-${bookingId}`}
      size="sm"
      variant="outline"
      className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markBookingCleaned(bookingId);
        })
      }
    >
      {pending ? "Menyimpan..." : "✓ Sudah Dibersihkan"}
    </Button>
  );
}

// ─── Section: Needs Cleaning ───────────────────────────────────────────────────

function NeedsCleaningSection({ entries }: { entries: CleaningEntry[] }) {
  return (
    <section id="needs-cleaning" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧹</span>
          <h2 className="text-base font-semibold">Perlu Dibersihkan</h2>
        </div>
        {entries.length > 0 && (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-0">
            {entries.length} unit
          </Badge>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <p className="text-3xl">✨</p>
          <p className="mt-3 font-semibold">Semua unit bersih!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidak ada unit yang perlu dibersihkan saat ini.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.bookingId}
              id={`cleaning-entry-${entry.bookingId}`}
              className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/20 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{entry.propertyName}</p>
                <p className="text-sm text-muted-foreground">
                  Tamu: {entry.guestName || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-sm">
                    Check-out: <span className="font-medium">{dateLabel(entry.checkOut)}</span>
                  </span>
                  <Badge
                    variant="secondary"
                    className={
                      entry.daysSince === 0
                        ? "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        : entry.daysSince >= 2
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                    }
                  >
                    {daysSinceLabel(entry.daysSince)}
                  </Badge>
                </div>
              </div>
              <MarkCleanButton bookingId={entry.bookingId} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Section: Upcoming Check-in ────────────────────────────────────────────────

function UpcomingSection({ entries }: { entries: UpcomingEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section id="upcoming-checkin" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h2 className="text-base font-semibold">Segera Check-in</h2>
        </div>
        <Badge variant="secondary">{entries.length} unit</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            id={`upcoming-entry-${i}`}
            className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{entry.propertyName}</p>
              <p className="text-sm text-muted-foreground">
                Tamu berikutnya: {entry.guestName || "—"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-sm">
                  Check-in: <span className="font-medium">{dateLabel(entry.checkIn)}</span>
                </span>
                <Badge
                  variant="secondary"
                  className={
                    entry.daysUntil === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : entry.daysUntil === 1
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  }
                >
                  {daysUntilLabel(entry.daysUntil)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center">
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                Siapkan unit
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section: Occupied ─────────────────────────────────────────────────────────

function OccupiedSection({ entries }: { entries: OccupiedEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section id="occupied-units" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛏️</span>
          <h2 className="text-base font-semibold text-muted-foreground">Sedang Ditempati</h2>
        </div>
        <Badge variant="secondary">{entries.length} unit</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            id={`occupied-entry-${i}`}
            className="flex flex-col gap-1 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{entry.propertyName}</p>
              <p className="text-sm text-muted-foreground">
                Tamu: {entry.guestName || "—"}
              </p>
              <span className="text-sm">
                Check-out: <span className="font-medium">{dateLabel(entry.checkOut)}</span>
              </span>
            </div>
            <Badge
              variant="secondary"
              className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓ Ditempati
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Root dashboard ────────────────────────────────────────────────────────────

export function CleaningDashboard({
  needsCleaning,
  occupied,
  upcoming,
  today,
}: {
  needsCleaning: CleaningEntry[];
  occupied: OccupiedEntry[];
  upcoming: UpcomingEntry[];
  today: string;
}) {
  const [d, m, y] = [
    new Date().getDate(),
    new Date().toLocaleDateString("id-ID", { month: "long" }),
    new Date().getFullYear(),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Kebersihan</h1>
        <p className="text-sm text-muted-foreground">
          {d} {m} {y} — Unit yang perlu dibersihkan, segera check-in, dan sedang ditempati.
        </p>
      </div>

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {needsCleaning.length}
          </span>
          <span className="text-xs text-center text-muted-foreground">Perlu Dibersihkan</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {upcoming.length}
          </span>
          <span className="text-xs text-center text-muted-foreground">Segera Check-in</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border bg-muted/30 p-4">
          <span className="text-2xl font-bold">{occupied.length}</span>
          <span className="text-xs text-center text-muted-foreground">Ditempati</span>
        </div>
      </div>

      {/* ── Sections ── */}
      <NeedsCleaningSection entries={needsCleaning} />
      <UpcomingSection entries={upcoming} />
      <OccupiedSection entries={occupied} />
    </div>
  );
}
