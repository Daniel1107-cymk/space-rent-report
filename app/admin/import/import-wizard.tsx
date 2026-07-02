"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { detectFormat, parseRows, type ParsedRow } from "@/lib/csv";
import { importBookings } from "@/app/actions";
import { formatIDR, dateLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/native-select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PropertyOption = { id: number; name: string };

type Parsed = {
  fileName: string;
  format: "airbnb" | "agoda";
  rows: ParsedRow[];
};

function guessProperty(listing: string, properties: PropertyOption[]): number {
  const l = listing.toLowerCase();
  const hit = properties.find(
    (p) => l.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(l)
  );
  return hit?.id ?? 0;
}

export function ImportWizard({ properties }: { properties: PropertyOption[] }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    setParsed(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const format = detectFormat(meta.fields ?? []);
        if (!format) {
          setError(
            "Could not recognize this file. Expected an Airbnb payout CSV or an Agoda bookings CSV."
          );
          return;
        }
        const rows = parseRows(format, data);
        if (rows.length === 0) {
          setError("The file was recognized but contained no importable booking rows.");
          return;
        }
        const listings = [...new Set(rows.map((r) => r.listing))];
        setMapping(
          Object.fromEntries(listings.map((l) => [l, guessProperty(l, properties)]))
        );
        setParsed({ fileName: file.name, format, rows });
      },
      error: () => setError("Could not read the file."),
    });
  }

  const mappedRows = parsed
    ? parsed.rows.filter((r) => (mapping[r.listing] ?? 0) > 0)
    : [];
  const missingPayouts = mappedRows.filter((r) => r.payoutIdr <= 0).length;

  function setPayout(index: number, value: string) {
    setParsed((p) =>
      p
        ? {
            ...p,
            rows: p.rows.map((r, i) =>
              i === index ? { ...r, payoutIdr: Math.max(0, Math.round(Number(value)) || 0) } : r
            ),
          }
        : p
    );
  }

  function runImport() {
    if (!parsed) return;
    startTransition(async () => {
      const res = await importBookings(
        mappedRows.map((r) => ({
          propertyId: mapping[r.listing],
          source: r.source,
          externalId: r.externalId,
          guestName: r.guestName,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          nights: r.nights,
          payoutIdr: r.payoutIdr,
        }))
      );
      if ("error" in res) {
        setError(res.error);
      } else {
        setResult(res);
        setParsed(null);
      }
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import bookings</h1>
        <p className="text-sm text-muted-foreground">
          Upload a payout CSV from Airbnb or a bookings CSV from Agoda. Rows already
          imported are skipped automatically, so re-uploading the same file is safe.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center transition-colors hover:bg-muted/50">
        <span className="font-medium">Choose a CSV file</span>
        <span className="text-sm text-muted-foreground">Airbnb or Agoda export</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium text-positive">{result.inserted} imported</span>
          {result.skipped > 0 && (
            <span className="text-muted-foreground">
              , {result.skipped} skipped (already imported or not mapped)
            </span>
          )}
        </div>
      )}

      {parsed && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">
              {parsed.format === "airbnb" ? "Airbnb" : "Agoda"}
            </Badge>
            <span className="text-muted-foreground">
              {parsed.fileName}: {parsed.rows.length} booking
              {parsed.rows.length === 1 ? "" : "s"} found
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Match listings to your properties</p>
            {Object.keys(mapping).map((listing) => (
              <div key={listing} className="grid grid-cols-2 items-center gap-3">
                <Label className="truncate" title={listing || "(no listing name)"}>
                  {listing || "(no listing name in file)"}
                </Label>
                <NativeSelect
                  value={mapping[listing] || ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [listing]: Number(e.target.value) || 0 }))
                  }
                >
                  <option value="">Skip these rows</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead>Listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.rows.map((r, i) => (
                <TableRow key={i} className={!mapping[r.listing] ? "opacity-40" : ""}>
                  <TableCell>{r.guestName || "-"}</TableCell>
                  <TableCell className="tabular">{dateLabel(r.checkIn)}</TableCell>
                  <TableCell className="tabular text-right">{r.nights}</TableCell>
                  <TableCell className="text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label="Payout in IDR"
                      value={r.payoutIdr || ""}
                      placeholder="0"
                      onChange={(e) => setPayout(i, e.target.value)}
                      className="tabular h-7 w-28 rounded-md border border-input bg-background px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">
                    {r.listing || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {missingPayouts > 0 && (
            <p className="text-xs text-muted-foreground">
              {missingPayouts} row{missingPayouts === 1 ? " has" : "s have"} no payout amount
              (this Agoda export does not include one). Type the amounts above, or import
              with 0 and fill them in later on the Bookings page.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setParsed(null)}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={pending || mappedRows.length === 0}>
              {pending
                ? "Importing..."
                : `Import ${mappedRows.length} booking${mappedRows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
