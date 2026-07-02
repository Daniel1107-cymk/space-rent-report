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
          <h1 className="text-xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">
            Each property has an owner and a commission rate.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>Add property</Button>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No properties yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first property to start recording bookings.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.ownerId ? (ownerName.get(p.ownerId) ?? "-") : "Unassigned"}
                </TableCell>
                <TableCell className="tabular text-right">{p.commissionPct}%</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${p.name}"? All of its bookings will be deleted too.`
                        )
                      )
                        deleteProperty(p.id);
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
          <DialogTitle>{property ? "Edit property" : "Add property"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={property?.id ?? ""} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={property?.name ?? ""}
              placeholder="Villa Sari"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ownerId">Owner</Label>
            <NativeSelect id="ownerId" name="ownerId" defaultValue={property?.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
            {owners.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No owners yet. You can add one on the Owners page and assign it later.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="commissionPct">Commission %</Label>
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
