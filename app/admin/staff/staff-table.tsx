"use client";

import { useActionState, useState } from "react";
import { saveStaff, deleteStaff, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";

type StaffRow = { id: number; name: string; username: string };

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const [editing, setEditing] = useState<StaffRow | "new" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Staf Kebersihan</h1>
          <p className="text-sm text-muted-foreground">
            Akun staf kebersihan dapat masuk dan melihat dashboard unit yang perlu dibersihkan.
          </p>
        </div>
        <Button id="add-staff-btn" onClick={() => setEditing("new")}>
          Tambah staf
        </Button>
      </div>

      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {staff.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-2xl">🧹</p>
          <p className="mt-3 font-medium">Belum ada staf kebersihan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat akun untuk setiap anggota staf kebersihan agar mereka dapat masuk ke portal.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id} id={`staff-row-${s.id}`}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.username}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    Kebersihan
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    id={`edit-staff-${s.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(s)}
                  >
                    Ubah
                  </Button>
                  <Button
                    id={`delete-staff-${s.id}`}
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm(`Hapus staf "${s.name}"?`)) return;
                      const result = await deleteStaff(s.id);
                      setDeleteError(result?.error ?? null);
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
        <StaffDialog
          staff={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StaffDialog({
  staff,
  onClose,
}: {
  staff: StaffRow | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveStaff(prev, formData);
      if (!result?.error) onClose();
      return result;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staff ? "Ubah staf" : "Tambah staf kebersihan"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={staff?.id ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-name">Nama</Label>
            <Input
              id="staff-name"
              name="name"
              defaultValue={staff?.name ?? ""}
              required
              placeholder="Budi Santoso"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-username">Username</Label>
            <Input
              id="staff-username"
              name="username"
              type="text"
              autoCapitalize="none"
              defaultValue={staff?.username ?? ""}
              placeholder="budi.cleaning"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-password">
              {staff ? "Password baru" : "Password"}
            </Label>
            <Input
              id="staff-password"
              name="password"
              type="password"
              minLength={8}
              required={!staff}
              placeholder={
                staff ? "Kosongkan jika tidak ingin diubah" : "Minimal 8 karakter"
              }
            />
            <p className="text-xs text-muted-foreground">
              Bagikan kredensial ini dengan staf. Anda dapat mengatur ulang password di sini kapan saja.
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
            <Button type="submit" id="save-staff-btn" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
