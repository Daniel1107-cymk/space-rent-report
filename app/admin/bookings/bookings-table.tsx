"use client";

import { useActionState, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { saveBooking, deleteBooking, syncBookings, type ActionState } from "@/app/actions";
import type { Booking } from "@/db/schema";
import { formatIDR, dateLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/native-select";
import { MonthPicker } from "@/components/month-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PropertyOption = { id: number; name: string };

const SOURCE_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  agoda: "Agoda",
  manual: "Manual",
};

export function BookingsTable({
  bookings,
  properties,
  month,
  propertyFilter,
  sourceFilter,
}: {
  bookings: Booking[];
  properties: PropertyOption[];
  month: string;
  propertyFilter: number;
  sourceFilter: string;
}) {
  const [editing, setEditing] = useState<Booking | "new" | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pemesanan</h1>
          <p className="text-sm text-muted-foreground">
            Disaring berdasarkan bulan check-in. Pemesanan impor dan manual digabungkan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Button onClick={() => setEditing("new")}>Tambah pemesanan</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker month={month} />
        <NativeSelect
          aria-label="Saring berdasarkan properti"
          className="w-44"
          value={propertyFilter || ""}
          onChange={(e) => setParam("property", e.target.value)}
        >
          <option value="">Semua properti</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Saring berdasarkan sumber"
          className="w-32"
          value={sourceFilter}
          onChange={(e) => setParam("source", e.target.value)}
        >
          <option value="">Semua sumber</option>
          <option value="airbnb">Airbnb</option>
          <option value="agoda">Agoda</option>
          <option value="manual">Manual</option>
        </NativeSelect>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Tidak ada pemesanan bulan ini</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambah secara manual atau impor CSV dari Airbnb atau Agoda.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Properti</TableHead>
              <TableHead>Tamu</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead className="text-right">Malam</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead className="text-right">Pembayaran</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">
                  {propertyName.get(b.propertyId) ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">{b.guestName || "-"}</TableCell>
                <TableCell className="tabular">{dateLabel(b.checkIn)}</TableCell>
                <TableCell className="tabular">{dateLabel(b.checkOut)}</TableCell>
                <TableCell className="tabular text-right">{b.nights}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{SOURCE_LABEL[b.source]}</Badge>
                </TableCell>
                <TableCell className="tabular text-right">{formatIDR(b.payoutIdr)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Hapus pemesanan ini?")) deleteBooking(b.id);
                    }}
                  >
                    Hapus
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing !== null && (
        <BookingDialog
          booking={editing === "new" ? null : editing}
          properties={properties}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { inserted, errors } = await syncBookings();
            setMessage(
              errors.length > 0
                ? `${inserted} baru, gagal: ${errors.join("; ")}`
                : `${inserted} pemesanan baru`
            );
          })
        }
      >
        {pending ? "Menyinkronkan..." : "Sinkronkan iCal"}
      </Button>
    </div>
  );
}

function BookingDialog({
  booking,
  properties,
  onClose,
}: {
  booking: Booking | null;
  properties: PropertyOption[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveBooking(prev, formData);
      if (!result?.error) onClose();
      return result;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{booking ? "Ubah pemesanan" : "Tambah pemesanan"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={booking?.id ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="propertyId">Properti</Label>
            <NativeSelect
              id="propertyId"
              name="propertyId"
              defaultValue={booking?.propertyId ?? ""}
              required
            >
              <option value="" disabled>
                Pilih properti
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">Sumber</Label>
            <NativeSelect id="source" name="source" defaultValue={booking?.source ?? "manual"}>
              <option value="manual">Manual</option>
              <option value="airbnb">Airbnb</option>
              <option value="agoda">Agoda</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guestName">Nama tamu</Label>
            <Input id="guestName" name="guestName" defaultValue={booking?.guestName ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkIn">Check-in</Label>
              <Input
                id="checkIn"
                name="checkIn"
                type="date"
                defaultValue={booking?.checkIn ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkOut">Check-out</Label>
              <Input
                id="checkOut"
                name="checkOut"
                type="date"
                defaultValue={booking?.checkOut ?? ""}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payoutIdr">Pembayaran (IDR)</Label>
            <Input
              id="payoutIdr"
              name="payoutIdr"
              type="number"
              min="0"
              step="1"
              defaultValue={booking?.payoutIdr ?? ""}
              placeholder="1500000"
              required
            />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
