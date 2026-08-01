"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type PropertyChartRow = {
  name: string;
  gross: number;
  commission: number;
  net: number;
  occupancyPct: number;
  nights: number;
};

const chartConfig = {
  gross: {
    label: "Kotor",
    color: "var(--color-chart-1)",
  },
  commission: {
    label: "Komisi",
    color: "var(--color-chart-2)",
  },
  net: {
    label: "Bersih Pemilik",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

function formatIDRShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
}

function formatIDRFull(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropertyOverviewChart({ data }: { data: PropertyChartRow[] }) {
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Revenue bar chart ── */}
      <div className="rounded-xl border p-4">
        <p className="mb-1 text-sm font-semibold">Pendapatan per Properti</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Kotor · Komisi · Bersih pemilik (IDR)
        </p>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={data}
            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="20%"
            barGap={3}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval={0}
              tickFormatter={(v: string) =>
                v.length > 14 ? v.slice(0, 13) + "…" : v
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatIDRShort}
              tick={{ fontSize: 11 }}
              width={48}
            />
            <ChartTooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-mono font-semibold">
                        {formatIDRFull(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="gross" fill="var(--color-gross)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" fill="var(--color-commission)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* ── Occupancy bar chart ── */}
      <div className="rounded-xl border p-4">
        <p className="mb-1 text-sm font-semibold">Tingkat Hunian</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Persentase malam terisi dari total hari dalam bulan ini
        </p>
        <ChartContainer
          config={{ occupancyPct: { label: "Hunian %", color: "var(--color-chart-4)" } }}
          className="h-44 w-full"
        >
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval={0}
              tickFormatter={(v: string) =>
                v.length > 14 ? v.slice(0, 13) + "…" : v
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11 }}
              width={38}
            />
            <ChartTooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-muted-foreground">Hunian</span>
                      <span className="font-mono font-semibold">
                        {value}% · {item.payload.nights} malam
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="occupancyPct"
              fill="var(--color-occupancyPct)"
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="occupancyPct"
                position="top"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => (v != null ? `${v}%` : "")}
                style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
