"use client";

import { useTransition } from "react";
import { markBookingCleaned } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CleaningEntry = {
  bookingId: number;
  propertyName: string;
  guestName: string | null;
  checkOut: string; // YYYY-MM-DD
  daysSince: number; // 0 = today, 1 = yesterday, …
};

export type OccupiedEntry = {
  propertyName: string;
  guestName: string | null;
  checkOut: string;
};

function daysSinceLabel(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MarkCleanButton({ bookingId }: { bookingId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
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

export function CleaningList({
  needsCleaning,
  occupied,
}: {
  needsCleaning: CleaningEntry[];
  occupied: OccupiedEntry[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {/* ── Needs Cleaning ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Perlu Dibersihkan</h2>
          {needsCleaning.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
            >
              {needsCleaning.length} unit
            </Badge>
          )}
        </div>

        {needsCleaning.length === 0 ? (
          <div className="rounded-xl border border-dashed py-14 text-center">
            <p className="text-2xl">✨</p>
            <p className="mt-2 font-medium">Semua unit bersih</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak ada unit yang perlu dibersihkan saat ini.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tamu terakhir</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Sejak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {needsCleaning.map((entry) => (
                <TableRow key={entry.bookingId}>
                  <TableCell className="font-medium">
                    {entry.propertyName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.guestName || "-"}
                  </TableCell>
                  <TableCell className="tabular">
                    {dateLabel(entry.checkOut)}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {daysSinceLabel(entry.daysSince)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                    >
                      Perlu dibersihkan
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <MarkCleanButton bookingId={entry.bookingId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Occupied / Clean ── */}
      {occupied.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-muted-foreground">
              Sedang Ditempati / Bersih
            </h2>
            <Badge variant="secondary">{occupied.length} unit</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tamu saat ini</TableHead>
                <TableHead>Check-out berikutnya</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occupied.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {entry.propertyName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.guestName || "-"}
                  </TableCell>
                  <TableCell className="tabular">
                    {dateLabel(entry.checkOut)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      ✓ Ditempati
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
