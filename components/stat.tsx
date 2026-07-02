import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 truncate text-xl font-semibold tracking-tight",
          accent && "text-positive"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
