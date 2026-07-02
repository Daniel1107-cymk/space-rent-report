"use client";

import { useActionState, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword, ActionState } from "@/app/actions";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [clientError, setClientError] = useState("");

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      setClientError("");
      const currentPassword = String(formData.get("currentPassword") ?? "");
      const newPassword = String(formData.get("newPassword") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");

      if (!currentPassword || !newPassword || !confirmPassword) {
        setClientError("Semua kolom wajib diisi.");
        return;
      }

      if (newPassword.length < 8) {
        setClientError("Kata sandi baru minimal harus 8 karakter.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setClientError("Kata sandi baru tidak cocok.");
        return;
      }

      const result = await changePassword(prev, formData);
      if (!result?.error) {
        setOpen(false);
      }
      return result;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Ubah kata sandi</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah kata sandi</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Kata sandi saat ini</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">Kata sandi baru</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              placeholder="Minimal 8 karakter"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Konfirmasi kata sandi baru</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              placeholder="Konfirmasi kata sandi baru"
              required
            />
          </div>
          {(clientError || state?.error) && (
            <p role="alert" className="text-sm text-destructive">
              {clientError || state?.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan kata sandi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
