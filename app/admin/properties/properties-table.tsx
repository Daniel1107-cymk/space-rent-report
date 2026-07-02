"use client";

import { useActionState, useState } from "react";
import { saveProperty, deleteProperty, type ActionState } from "@/app/actions";
import type { Property } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
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

type Owner = { id: number; name: string };

export function PropertiesTable({
  properties,
  owners,
}: {
  properties: Property[];
  owners: Owner[];
}) {
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Properti</h1>
          <p className="text-sm text-muted-foreground">
            Setiap properti memiliki pemilik dan tingkat komisi.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>Tambah properti</Button>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Belum ada properti</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan properti pertama Anda untuk mulai mencatat pemesanan.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead className="text-right">Komisi</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.ownerId ? (ownerName.get(p.ownerId) ?? "-") : "Belum ditugaskan"}
                </TableCell>
                <TableCell className="tabular text-right">{p.commissionPct}%</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        confirm(
                          `Hapus "${p.name}"? Semua pemesanan untuk properti ini juga akan dihapus.`
                        )
                      )
                        deleteProperty(p.id);
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
        <PropertyDialog
          property={editing === "new" ? null : editing}
          owners={owners}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PropertyDialog({
  property,
  owners,
  onClose,
}: {
  property: Property | null;
  owners: Owner[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveProperty(prev, formData);
      if (!result?.error) onClose();
      return result;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{property ? "Ubah properti" : "Tambah properti"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={property?.id ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              name="name"
              defaultValue={property?.name ?? ""}
              placeholder="Villa Sari"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ownerId">Pemilik</Label>
            <NativeSelect id="ownerId" name="ownerId" defaultValue={property?.ownerId ?? ""}>
              <option value="">Belum ditugaskan</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
            {owners.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada pemilik. Anda dapat menambahkan pemilik di halaman Pemilik dan menetapkannya nanti.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="commissionPct">Komisi %</Label>
            <Input
              id="commissionPct"
              name="commissionPct"
              type="number"
              min="0"
              max="100"
              step="0.5"
              defaultValue={property?.commissionPct ?? 20}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="airbnbIcalUrl">URL iCal Airbnb</Label>
            <Input
              id="airbnbIcalUrl"
              name="airbnbIcalUrl"
              type="url"
              defaultValue={property?.airbnbIcalUrl ?? ""}
              placeholder="https://www.airbnb.com/calendar/ical/..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agodaIcalUrl">URL iCal Agoda</Label>
            <Input
              id="agodaIcalUrl"
              name="agodaIcalUrl"
              type="url"
              defaultValue={property?.agodaIcalUrl ?? ""}
              placeholder="https://ycs.agoda.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Opsional. Pemesanan baru disinkronkan otomatis setiap hari dari kalender iCal
              (tanpa nominal — isi pembayaran nanti).
            </p>
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
