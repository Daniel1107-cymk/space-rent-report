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
        setClientError("All fields are required.");
        return;
      }

      if (newPassword.length < 8) {
        setClientError("New password must be at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setClientError("New passwords do not match.");
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
      <DialogTrigger render={<Button variant="ghost" size="sm">Change password</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              placeholder="Confirm new password"
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
