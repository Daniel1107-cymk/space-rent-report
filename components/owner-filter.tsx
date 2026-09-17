"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function OwnerFilter({
  ownerId,
  owners,
}: {
  ownerId: string;
  owners: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={ownerId}
      aria-label="Filter pemilik"
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        params.set("owner", e.target.value);
        router.replace(`${pathname}?${params}`);
      }}
      className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="all">Semua pemilik</option>
      {owners.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
