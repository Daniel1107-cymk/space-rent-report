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
            "File tidak dikenali. Diharapkan CSV pembayaran Airbnb atau CSV pemesanan Agoda."
          );
          return;
        }
        const rows = parseRows(format, data);
        if (rows.length === 0) {
          setError("File dikenali tetapi tidak berisi baris pemesanan yang dapat diimpor.");
          return;
        }
        const listings = [...new Set(rows.map((r) => r.listing))];
        setMapping(
          Object.fromEntries(listings.map((l) => [l, guessProperty(l, properties)]))
        );
        setParsed({ fileName: file.name, format, rows });
      },
      error: () => setError("Tidak dapat membaca file."),
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
        <h1 className="text-xl font-semibold tracking-tight">Impor pemesanan</h1>
        <p className="text-sm text-muted-foreground">
          Unggah CSV pembayaran dari Airbnb atau CSV pemesanan dari Agoda. Baris yang sudah
          diimpor akan dilewati secara otomatis, sehingga aman untuk mengunggah ulang file yang sama.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed py-10 text-center transition-colors hover:bg-muted/50">
        <span className="font-medium">Pilih file CSV</span>
        <span className="text-sm text-muted-foreground">Ekspor Airbnb atau Agoda</span>
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
          <span className="font-medium text-positive">{result.inserted} diimpor</span>
          {result.skipped > 0 && (
            <span className="text-muted-foreground">
              , {result.skipped} dilewati (sudah diimpor atau tidak dipetakan)
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
              {parsed.fileName}: {parsed.rows.length} pemesanan ditemukan
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Cocokkan iklan dengan properti Anda</p>
            {Object.keys(mapping).map((listing) => (
              <div key={listing} className="grid grid-cols-2 items-center gap-3">
                <Label className="truncate" title={listing || "(tidak ada nama iklan)"}>
                  {listing || "(tidak ada nama iklan di file)"}
                </Label>
                <NativeSelect
                  value={mapping[listing] || ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [listing]: Number(e.target.value) || 0 }))
                  }
                >
                  <option value="">Lewati baris ini</option>
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
                <TableHead>Tamu</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Malam</TableHead>
                <TableHead className="text-right">Pembayaran</TableHead>
                <TableHead>Iklan</TableHead>
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
                      aria-label="Pembayaran dalam IDR"
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
              {missingPayouts} baris tidak memiliki nominal pembayaran
              (ekspor Agoda ini tidak mencantumkannya). Ketik nominal di atas, atau impor
              dengan nilai 0 dan isi nanti di halaman Pemesanan.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setParsed(null)}>
              Batal
            </Button>
            <Button onClick={runImport} disabled={pending || mappedRows.length === 0}>
              {pending
                ? "Mengimpor..."
                : `Impor ${mappedRows.length} pemesanan`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
