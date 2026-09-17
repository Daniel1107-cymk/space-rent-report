"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ponytail: two native <input type="month">, same pattern as MonthPicker
export function MonthRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (key: string, value: string) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.replace(`${pathname}?${params}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="month"
        value={from}
        aria-label="Dari bulan"
        onChange={(e) => set("from", e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <span className="text-sm text-muted-foreground">–</span>
      <input
        type="month"
        value={to}
        aria-label="Sampai bulan"
        onChange={(e) => set("to", e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
