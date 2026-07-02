"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ponytail: native <input type="month"> over a calendar lib
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <input
      type="month"
      value={month}
      aria-label="Report month"
      onChange={(e) => {
        if (!e.target.value) return;
        const params = new URLSearchParams(searchParams);
        params.set("month", e.target.value);
        router.replace(`${pathname}?${params}`);
      }}
      className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
