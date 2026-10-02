"use client";

import { useActionState, useState } from "react";
import { saveTransfer, deleteTransfer, type ActionState } from "@/app/actions";
import { formatIDR, dateLabel } from "@/lib/format";
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

type BalanceRow = { ownerId: number; name: string; balance: number };
type TransferRow = {
  id: number;
  ownerName: string;
  amountIdr: number;
  transferredOn: string;
  note: string | null;
};

export function Transfers({ balances, history }: { balances: BalanceRow[]; history: TransferRow[] }) {
  const [paying, setPaying] = useState<BalanceRow | null>(null);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="border-b pb-2">
          <h2 className="font-semibold tracking-tight">Saldo pemilik</h2>
          <p className="text-sm text-muted-foreground">
            Pendapatan bersih s/d akhir bulan lalu dikurangi semua transfer.
          </p>
        </div>
        {balances.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Belum ada pemilik.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemilik</TableHead>
                <TableHead className="text-right">Saldo ditahan</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.ownerId}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="tabular text-right">{formatIDR(b.balance)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setPaying(b)}>
                      Transfer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="border-b pb-2 font-semibold tracking-tight">Riwayat transfer</h2>
        {history.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Belum ada transfer.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pemilik</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="tabular">{dateLabel(t.transferredOn)}</TableCell>
                  <TableCell>{t.ownerName}</TableCell>
                  <TableCell className="text-muted-foreground">{t.note}</TableCell>
                  <TableCell className="tabular text-right">{formatIDR(t.amountIdr)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`Hapus transfer ${formatIDR(t.amountIdr)} ke ${t.ownerName}?`)) return;
                        await deleteTransfer(t.id);
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
      </section>

      {paying && <TransferDialog owner={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function TransferDialog({ owner, onClose }: { owner: BalanceRow; onClose: () => void }) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveTransfer(prev, formData);
      if (!result?.error) onClose();
      return result;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ke {owner.name}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="ownerId" value={owner.ownerId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="amountIdr">Jumlah (Rp)</Label>
            <Input
              id="amountIdr"
              name="amountIdr"
              // text, not number: type=number reads "1.000.000" as 1
              inputMode="numeric"
              defaultValue={Math.max(owner.balance, 0) || ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Saldo ditahan saat ini {formatIDR(owner.balance)}. Ubah jumlah untuk transfer sebagian.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transferredOn">Tanggal transfer</Label>
            <Input
              id="transferredOn"
              name="transferredOn"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Catatan</Label>
            <Input id="note" name="note" placeholder="mis. Pendapatan September 2026" />
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
