"use client";

import { useActionState, useState } from "react";
import { saveOwner, deleteOwner, type ActionState } from "@/app/actions";
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

type OwnerRow = { id: number; name: string; username: string; propertyCount: number };

export function OwnersTable({ owners }: { owners: OwnerRow[] }) {
  const [editing, setEditing] = useState<OwnerRow | "new" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Owners</h1>
          <p className="text-sm text-muted-foreground">
            Owner accounts can sign in and see reports for their properties.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>Add owner</Button>
      </div>

      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {owners.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No owners yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an account for each property owner so they can log in.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="text-right">Properties</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-muted-foreground">{o.username}</TableCell>
                <TableCell className="tabular text-right">{o.propertyCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(o)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete owner "${o.name}"?`)) return;
                      const result = await deleteOwner(o.id);
                      setDeleteError(result?.error ?? null);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing !== null && (
        <OwnerDialog
          owner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function OwnerDialog({ owner, onClose }: { owner: OwnerRow | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveOwner(prev, formData);
      if (!result?.error) onClose();
      return result;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{owner ? "Edit owner" : "Add owner"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={owner?.id ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={owner?.name ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoCapitalize="none"
              defaultValue={owner?.username ?? ""}
              placeholder="made"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{owner ? "New password" : "Password"}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required={!owner}
              placeholder={owner ? "Leave blank to keep current" : "At least 8 characters"}
            />
            <p className="text-xs text-muted-foreground">
              Share these credentials with the owner. There is no self-service reset;
              you can set a new password here anytime.
            </p>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
